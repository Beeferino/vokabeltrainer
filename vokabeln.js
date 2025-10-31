window.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  function showToast(msg, ok = true) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    if (!ok) toast.style.background = "#ef4444";
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  const btnSave = document.getElementById("mSave");
  const btnCancel = document.getElementById("mCancel");
  const modal = document.getElementById("modal");

  btnSave.onclick = () => {
    showToast("✅ Erfolgreich gespeichert!");
    modal.style.display = "none";
  };

  btnCancel.onclick = () => {
    showToast("❌ Abgebrochen", false);
    modal.style.display = "none";
  };
});
