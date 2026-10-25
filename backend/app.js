import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const vehicleSchema=z.object({make:z.string().trim().min(1).max(80),model:z.string().trim().min(1).max(80),category:z.string().trim().min(1).max(60),price:z.number().finite().nonnegative(),quantity:z.number().int().nonnegative()});
const authSchema=z.object({email:z.string().email().max(254),password:z.string().min(8).max(128)});
const registerSchema=authSchema.extend({name:z.string().trim().min(2).max(80)});
const qtySchema=z.object({quantity:z.number().int().positive()});
export function createApp(db,{secret=process.env.JWT_SECRET,origin=process.env.FRONTEND_ORIGIN||'http://localhost:5173'}={}){
 if(!secret || secret.length<24) throw new Error('JWT_SECRET must be set and at least 24 characters');
 const app=express();app.use(helmet());app.use(cors({origin}));app.use(express.json({limit:'32kb'}));
 const authLimiter=rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:'draft-7',legacyHeaders:false});
 const validate=(schema,source='body')=>(req,res,next)=>{const parsed=schema.safeParse(req[source]);if(!parsed.success)return res.status(400).json({error:'Invalid input',details:parsed.error.flatten()});req.validated=parsed.data;next();};
 const protect=(req,res,next)=>{const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];if(!token)return res.status(401).json({error:'Authentication required'});try{const payload=jwt.verify(token,secret,{algorithms:['HS256']});const user=db.prepare('SELECT id,name,email,role FROM users WHERE id=?').get(payload.sub);if(!user)return res.status(401).json({error:'Invalid token'});req.user=user;next();}catch{return res.status(401).json({error:'Invalid token'});}};
 const admin=(req,res,next)=>req.user.role==='admin'?next():res.status(403).json({error:'Admin only'});
 const id=(req,res,next)=>{const n=Number(req.params.id);if(!Number.isSafeInteger(n)||n<=0)return res.status(400).json({error:'Invalid vehicle ID'});req.vehicleId=n;next();};
 const getVehicle=(id)=>db.prepare('SELECT * FROM vehicles WHERE id=?').get(id);
 app.get('/api/health',(req,res)=>res.json({status:'ok'}));
 app.post('/api/auth/register',authLimiter,validate(registerSchema),(req,res)=>{const {name,email,password}=req.validated;try{const role=db.prepare('SELECT COUNT(*) AS n FROM users').get().n===0?'admin':'user';const result=db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)').run(name,email.toLowerCase(),bcrypt.hashSync(password,12),role);res.status(201).json({id:result.lastInsertRowid,name,email:email.toLowerCase(),role});}catch(e){if(e.code==='SQLITE_CONSTRAINT_UNIQUE')return res.status(409).json({error:'Email already registered'});throw e;}});
 app.post('/api/auth/login',authLimiter,validate(authSchema),(req,res)=>{const {email,password}=req.validated;const user=db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase());if(!user||!bcrypt.compareSync(password,user.password_hash))return res.status(401).json({error:'Invalid credentials'});const token=jwt.sign({},secret,{subject:String(user.id),expiresIn:'8h',algorithm:'HS256'});res.json({token,user:{id:user.id,name:user.name,email:user.email,role:user.role}});});
 app.get('/api/auth/me',protect,(req,res)=>res.json(req.user));
 app.get('/api/vehicles',protect,(req,res)=>res.json(db.prepare('SELECT * FROM vehicles ORDER BY id DESC').all()));
 app.get('/api/vehicles/search',protect,(req,res)=>{const {make='',model='',category='',minPrice='',maxPrice=''}=req.query;const prices=[minPrice,maxPrice].filter(x=>x!=='');if(prices.some(x=>!Number.isFinite(Number(x))||Number(x)<0))return res.status(400).json({error:'Invalid price range'});res.json(db.prepare('SELECT * FROM vehicles WHERE lower(make) LIKE ? AND lower(model) LIKE ? AND lower(category) LIKE ? AND price >= ? AND price <= ? ORDER BY id DESC').all(...[make,model,category].map(x=>`%${String(x).toLowerCase().replace(/[\\%_]/g,'\\$&')}%`),minPrice===''?0:Number(minPrice),maxPrice===''?Number.MAX_SAFE_INTEGER:Number(maxPrice)));});
 app.post('/api/vehicles',protect,admin,validate(vehicleSchema),(req,res)=>{const v=req.validated;const result=db.prepare('INSERT INTO vehicles(make,model,category,price,quantity) VALUES(?,?,?,?,?)').run(v.make,v.model,v.category,v.price,v.quantity);res.status(201).json(getVehicle(result.lastInsertRowid));});
 app.put('/api/vehicles/:id',protect,admin,id,validate(vehicleSchema),(req,res)=>{if(!getVehicle(req.vehicleId))return res.status(404).json({error:'Vehicle not found'});const v=req.validated;db.prepare('UPDATE vehicles SET make=?,model=?,category=?,price=?,quantity=? WHERE id=?').run(v.make,v.model,v.category,v.price,v.quantity,req.vehicleId);res.json(getVehicle(req.vehicleId));});
 app.delete('/api/vehicles/:id',protect,admin,id,(req,res)=>{if(!getVehicle(req.vehicleId))return res.status(404).json({error:'Vehicle not found'});if(db.prepare('SELECT 1 FROM transactions WHERE vehicle_id=? LIMIT 1').get(req.vehicleId))return res.status(409).json({error:'Vehicle has transaction history and cannot be deleted'});db.prepare('DELETE FROM vehicles WHERE id=?').run(req.vehicleId);res.status(204).end();});
 const changeStock=(type)=>(req,res)=>{const q=req.validated.quantity;const operation=db.transaction(()=>{const vehicle=getVehicle(req.vehicleId);if(!vehicle)return {code:404,error:'Vehicle not found'};if(type==='purchase'&&vehicle.quantity<q)return {code:409,error:'Insufficient stock'};db.prepare(`UPDATE vehicles SET quantity=quantity ${type==='purchase'?'-':'+'} ? WHERE id=?`).run(q,req.vehicleId);db.prepare('INSERT INTO transactions(vehicle_id,user_id,type,quantity) VALUES(?,?,?,?)').run(req.vehicleId,req.user.id,type,q);return {vehicle:getVehicle(req.vehicleId)};});const result=operation();if(result.error)return res.status(result.code).json({error:result.error});res.json(result.vehicle);};
 app.post('/api/vehicles/:id/purchase',protect,id,validate(qtySchema),changeStock('purchase'));
 app.post('/api/vehicles/:id/restock',protect,admin,id,validate(qtySchema),changeStock('restock'));
 app.get('/api/transactions',protect,admin,(req,res)=>res.json(db.prepare('SELECT t.*,v.make,v.model,u.name AS user_name FROM transactions t JOIN vehicles v ON v.id=t.vehicle_id JOIN users u ON u.id=t.user_id ORDER BY t.id DESC LIMIT 100').all()));
 app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Internal server error'});});return app;
}
