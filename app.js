(() => {
  const $ = (id) => document.getElementById(id);
  const guestView = $("guest-view");
  const adminView = $("admin-view");
  const configured = window.SUPABASE_URL && window.SUPABASE_ANON_KEY &&
    !window.SUPABASE_URL.includes("YOUR-PROJECT") &&
    !window.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");

  let supabase = null;
  if (configured && window.supabase) {
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }

  function showRoute() {
    const isAdmin = location.hash === "#admin";
    guestView.classList.toggle("hidden", isAdmin);
    adminView.classList.toggle("hidden", !isAdmin);
    if (isAdmin) checkSession();
  }
  window.addEventListener("hashchange", showRoute);

  function configMessage(target) {
    target.textContent = "برای فعال شدن سایت، ابتدا مراحل راه‌اندازی Supabase را در فایل README انجام بده.";
  }

  $("wish-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = $("form-status");
    const button = $("send-button");
    if (!supabase) return configMessage(status);

    const sender = $("sender").value.trim();
    const message = $("message").value.trim();
    if (!message) {
      status.textContent = "لطفاً آرزوت رو بنویس.";
      return;
    }

    button.disabled = true;
    status.textContent = "دارم آرزوت رو می‌فرستم...";
    const { error } = await supabase.from("wishes").insert({
      sender_name: sender || null,
      message
    });
    button.disabled = false;

    if (error) {
      console.error(error);
      status.textContent = "ارسال انجام نشد. لطفاً کمی بعد دوباره امتحان کن.";
      return;
    }
    $("wish-form").reset();
    status.textContent = "آرزوت با موفقیت به دست دونیا رسید. ممنون از مهربونیت! 💙";
  });

  async function checkSession() {
    if (!supabase) return configMessage($("login-status"));
    const { data } = await supabase.auth.getSession();
    $("login-form").classList.toggle("hidden", !!data.session);
    $("wishes-area").classList.toggle("hidden", !data.session);
    if (data.session) loadWishes();
  }

  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabase) return configMessage($("login-status"));
    const status = $("login-status");
    status.textContent = "در حال ورود...";
    const { error } = await supabase.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    });
    if (error) {
      status.textContent = "ورود ناموفق بود. ایمیل و رمز عبور رو بررسی کن.";
      return;
    }
    $("login-form").classList.add("hidden");
    $("wishes-area").classList.remove("hidden");
    loadWishes();
  });

  async function loadWishes() {
    const status = $("admin-status");
    const list = $("wishes-list");
    status.textContent = "در حال دریافت آرزوها...";
    list.replaceChildren();
    const { data, error } = await supabase
      .from("wishes")
      .select("id, sender_name, message, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      status.textContent = "دریافت آرزوها ممکن نشد. تنظیمات دسترسی دیتابیس رو بررسی کن.";
      return;
    }

    $("wish-count").textContent = new Intl.NumberFormat("fa-IR").format(data.length);
    status.textContent = "";
    if (!data.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "هنوز آرزویی نرسیده؛ اولین پیام به‌زودی اینجا میاد ✨";
      list.append(empty);
      return;
    }

    for (const wish of data) {
      const article = document.createElement("article");
      article.className = "wish-item";
      const message = document.createElement("p");
      message.textContent = wish.message;
      const meta = document.createElement("div");
      meta.className = "wish-meta";
      const sender = document.createElement("span");
      sender.textContent = wish.sender_name || "ناشناس";
      const date = document.createElement("time");
      date.dateTime = wish.created_at;
      date.textContent = new Date(wish.created_at).toLocaleString("fa-IR");
      meta.append(sender, date);
      article.append(message, meta);
      list.append(article);
    }
  }

  $("refresh-button").addEventListener("click", loadWishes);
  $("logout-button").addEventListener("click", async () => {
    await supabase.auth.signOut();
    $("wishes-area").classList.add("hidden");
    $("login-form").classList.remove("hidden");
    $("login-status").textContent = "از حساب خصوصی خارج شدی.";
  });

  showRoute();
})();
