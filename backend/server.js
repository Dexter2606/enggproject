import 'dotenv/config';
import { createDb } from './db.js';
import { createApp } from './app.js';
const db=createDb();
const app=createApp(db);
const port=Number(process.env.PORT||3001);
app.listen(port,()=>console.log(`API listening on http://localhost:${port}`));
