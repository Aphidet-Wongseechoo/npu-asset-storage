# Equipment storage system

โปรเจกต์นี้เป็นเว็บ HTML/CSS/JavaScript พร้อมเซิร์ฟเวอร์ Node.js สำหรับบันทึกข้อมูลลงไฟล์ `data/assets.json`

## วิธีรันใน Visual Studio Code

1. เปิดโฟลเดอร์โปรเจกต์นี้ใน VS Code
2. เปิด Terminal ใน VS Code
3. รันคำสั่ง:

```bash
npm start
```

ถ้าใช้ PowerShell แล้วเจอข้อความว่า `npm.ps1 cannot be loaded` ให้ใช้คำสั่งนี้แทน:

```bash
npm.cmd start
```

หรือรันตรงด้วย Node.js:

```bash
node server.js
```

4. เปิดเว็บ:

```text
http://127.0.0.1:4173/
```

## เปิดออนไลน์ชั่วคราวจากเครื่องตัวเอง

เปิด Terminal อันที่ 1 แล้วรัน:

```bash
npm start
```

เปิด Terminal อันที่ 2 แล้วรัน:

```bash
npm run tunnel
```

ระบบจะแสดง URL หน้าตาประมาณ:

```text
https://example.trycloudflare.com
```

ตราบใดที่เครื่องนี้ยังเปิดอยู่และคำสั่งทั้งสองยังรันอยู่ คนอื่นจะเข้าเว็บผ่าน URL นั้นได้

## ไฟล์สำคัญ

- `index.html` หน้าเว็บหลัก
- `style.css` หน้าตาเว็บ
- `script.js` ระบบเพิ่ม แก้ไข ลบ ค้นหา และเชื่อม API
- `server.js` เซิร์ฟเวอร์ Node.js
- `data/assets.json` ไฟล์เก็บข้อมูลครุภัณฑ์

## บัญชีแอดมิน

```text
ชื่อผู้ใช้: Aphidet
รหัสผ่าน: 281251
```

หมายเหตุ: รหัสผ่านอยู่ในไฟล์ JavaScript เหมาะกับงานทดลองหรือใช้งานภายในเครื่อง หากใช้งานจริงออนไลน์ควรทำระบบล็อกอินฝั่งเซิร์ฟเวอร์

## วิธีเปิดให้เป็นเว็บออนไลน์

เว็บนี้มีเซิร์ฟเวอร์ Node.js และ API `/api/assets` สำหรับบันทึกข้อมูล จึงไม่เหมาะกับ GitHub Pages อย่างเดียว เพราะ GitHub Pages ใช้สำหรับเว็บ static เช่น HTML, CSS และ JavaScript แต่ไม่รันเซิร์ฟเวอร์ Node.js

วิธีที่แนะนำคืออัปโหลดโปรเจกต์ขึ้น GitHub แล้ว deploy ด้วยบริการที่รัน Node.js ได้ เช่น Render, Railway หรือ VPS

### ตัวอย่างตั้งค่าบน Render

1. สร้าง repository ใน GitHub
2. อัปโหลดไฟล์ทั้งหมดของโปรเจกต์นี้ขึ้น repository
3. เข้า Render แล้วเลือก New > Web Service
4. เลือก repository นี้
5. ตั้งค่า:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /health
```

6. Deploy แล้วเปิด URL ที่ระบบสร้างให้ เช่น `https://your-app.onrender.com`

โปรเจกต์นี้มีไฟล์ `render.yaml` ให้แล้ว ถ้าใช้ Render Blueprint ระบบจะอ่านค่าพื้นฐานจากไฟล์นี้ได้

### หมายเหตุเรื่องข้อมูล

ตอนนี้ข้อมูลถูกเก็บในไฟล์ `data/assets.json` บนเซิร์ฟเวอร์ เหมาะกับงานทดลองหรือใช้งานขนาดเล็ก หาก deploy บนบริการที่ filesystem เป็นแบบชั่วคราว ข้อมูลที่เพิ่มหลัง deploy อาจหายเมื่อ redeploy หรือ restart

ถ้าต้องการให้ข้อมูล JSON อยู่ถาวรบน Render ให้เพิ่ม Persistent Disk แล้วตั้ง Environment Variable:

```text
DATA_DIR=/var/data
```

โดยตั้ง Disk Mount Path เป็น:

```text
/var/data
```

ถ้าใช้งานจริงหลายคนพร้อมกันหรือข้อมูลสำคัญ ควรเปลี่ยนไปใช้ฐานข้อมูล เช่น Firebase, Supabase, MySQL หรือ PostgreSQL
