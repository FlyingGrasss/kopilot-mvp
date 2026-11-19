import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://localhost:3100";
const browser = await chromium.launch({ headless: true });
const out = { steps: [], errors: [] };
const step = async (name, fn) => {
  try { await fn(); out.steps.push({ name, ok: true }); }
  catch (e) { out.steps.push({ name, ok: false, error: String(e).slice(0, 260) }); throw e; }
};

const login = async (page, username) => {
  await page.goto(`${base}/giris`, { waitUntil: "networkidle" });
  await page.locator('input[name="username"], input').first().fill(username);
  await page.locator('input[type="password"]').first().fill("demo1234");
  await page.getByRole("button", { name: /Giriş yap/ }).click();
  await page.waitForTimeout(2500);
};

try {
  const student = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  student.on("pageerror", (e) => out.errors.push(String(e)));

  await step("landing renders", async () => {
    await student.goto(base, { waitUntil: "networkidle" });
    await student.getByText(/mentor|Mentor/).first().waitFor({ timeout: 15000 });
  });

  await step("mentor list", async () => {
    await student.goto(`${base}/mentorlar`, { waitUntil: "networkidle" });
    await student.getByText(/elif|Elif/).first().waitFor({ timeout: 15000 });
  });

  await step("student login", async () => {
    await login(student, "deniz_ak");
    await student.waitForTimeout(1500);
    const body = await student.locator("body").innerText();
    out.loggedIn = /Deniz Ak/.test(body);
    if (!out.loggedIn) throw new Error("login did not stick: " + student.url());
  });

  await step("open mentor and book slot", async () => {
    await student.goto(`${base}/mentorlar/seed_mentor_elif`, { waitUntil: "networkidle" });
    await student.waitForTimeout(1500);
    const slot = student.getByRole("button", { name: /Seç|slot|Saat/i }).first();
    if (await slot.count()) await slot.click();
    const book = student.getByRole("button", { name: /Talep|Rezerv|Gönder/i }).first();
    if (await book.count()) await book.click();
    await student.waitForTimeout(2500);
    out.booked = /talep|bekliyor|gönderildi/i.test(await student.locator("body").innerText());
  });

  await step("mentor accepts", async () => {
    const mentor = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await login(mentor, "elif_yılmaz");
    await mentor.goto(`${base}/panel`, { waitUntil: "networkidle" });
    await mentor.waitForTimeout(2000);
    const accept = mentor.getByRole("button", { name: /Kabul|Onayla/i }).first();
    if (await accept.count()) {
      await accept.click();
      await mentor.waitForTimeout(2000);
    }
    out.accepted = /kabul|onaylandı|accepted/i.test(await mentor.locator("body").innerText());
    await mentor.close();
  });
} catch {}

console.log(JSON.stringify(out, null, 2));
await browser.close();
