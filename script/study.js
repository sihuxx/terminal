import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 🔥 Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBByCMlfqAZMzSOYlvEGm7Rd6aXXeByjwY",
    authDomain: "terminal-2340c.firebaseapp.com",
    databaseURL: "https://terminal-2340c-default-rtdb.firebaseio.com",
    projectId: "terminal-2340c",
    storageBucket: "terminal-2340c.firebasestorage.app",
    messagingSenderId: "611432501438",
    appId: "1:611432501438:web:43e3d7e5e2279bf3338eef",
    measurementId: "G-WSE9YE9D5W"
};

// 🔥 Cloudinary 설정
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dxofevdof/image/upload";
const CLOUDINARY_PRESET = "images";

const ALLOWED_EMAILS = ["sihu714@gmail.com"];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const postsCol = collection(db, "study_posts");

marked.setOptions({ breaks: true, gfm: true });

let posts = [], currentPost = null, editMode = false;
let currentUser = null, isAdmin = false;
let uploadedImages = [];
const PER_PAGE = 10;
let currentPage = 1;

// ── AUTH ──────────────────────────────────────────────
onAuthStateChanged(auth, user => {
    currentUser = user;
    isAdmin = user ? ALLOWED_EMAILS.includes(user.email) : false;
    renderHeaderUser(user);
    renderAdminUI();
    loadPosts();
});

function renderHeaderUser(user) {
    const el = document.getElementById("headerUser");
    if (user) {
        el.innerHTML = `<span class="user-email">> ${user.email}</span><button class="logout-btn" id="logoutBtn">로그아웃</button>`;
        document.getElementById("logoutBtn").addEventListener("click", async () => { await signOut(auth); showToast("로그아웃 되었습니다."); });
    } else {
        el.innerHTML = `<a href="./login.html" class="login-link">로그인</a>`;
    }
}

function renderAdminUI() {
    document.getElementById("writeBtn").style.display = isAdmin ? "block" : "none";
    document.getElementById("adminBadge").style.display = isAdmin ? "inline" : "none";
    document.getElementById("readonlyNotice").style.display = !isAdmin ? "block" : "none";
}

// ── UTILS ─────────────────────────────────────────────
function showToast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2500); }
function formatDate(ts) { if (!ts) return ""; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function escapeHtml(str = "") { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function renderTags(tags = []) { return tags.map(t => `<span class="study-tag">${escapeHtml(t.trim())}</span>`).join(""); }

// ── 마크다운 탭 ───────────────────────────────────────
window.switchMdTab = function (tab) {
    const ta = document.getElementById("postBodyInput"), pr = document.getElementById("mdPreview");
    document.querySelectorAll(".md-tab").forEach((t, i) => t.classList.toggle("active", (i === 0) === (tab === "write")));
    if (tab === "preview") {
        pr.classList.add("active"); ta.style.display = "none";
        pr.innerHTML = marked.parse(ta.value || "_내용 없음_");
        pr.querySelectorAll("pre code").forEach(b => hljs.highlightElement(b));
    } else {
        pr.classList.remove("active"); ta.style.display = "block"; ta.focus();
    }
};

window.mdWrap = function (before, after) {
    const ta = document.getElementById("postBodyInput"), s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.substring(s, e) || "텍스트";
    ta.value = ta.value.substring(0, s) + before + sel + after + ta.value.substring(e);
    ta.focus(); ta.setSelectionRange(s + before.length, s + before.length + sel.length);
};
window.mdInsert = function (text) {
    const ta = document.getElementById("postBodyInput"), s = ta.selectionStart;
    const lineStart = ta.value.substring(0, s).lastIndexOf("\n") + 1;
    ta.value = ta.value.substring(0, lineStart) + text + ta.value.substring(lineStart);
    ta.focus(); ta.setSelectionRange(lineStart + text.length, lineStart + text.length);
};

// ── 이미지 업로드 (Cloudinary 연동) ───────────────────
const uploadArea = document.getElementById("uploadArea");
uploadArea.addEventListener("dragover", e => { e.preventDefault(); uploadArea.classList.add("dragover"); });
uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("dragover"));
uploadArea.addEventListener("drop", e => { e.preventDefault(); uploadArea.classList.remove("dragover"); handleFileSelect(e.dataTransfer.files); });

window.handleFileSelect = async function (files) {
    for (const file of files) {
        if (!file.type.startsWith("image/")) { showToast("이미지 파일만 업로드 가능합니다."); continue; }
        if (file.size > 5 * 1024 * 1024) { showToast("5MB 이하만 업로드 가능합니다."); continue; }

        const prog = document.getElementById("uploadProgress");
        prog.textContent = "Cloudinary 업로드 중...";

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_PRESET);

        try {
            const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
            if (!res.ok) throw new Error("업로드 응답 실패");

            const data = await res.json();
            const url = data.secure_url;
            const path = data.public_id; // Cloudinary 식별자

            uploadedImages.push({ url, path });
            addImgPreview(url, path);

            // 에디터에 자동 삽입
            const ta = document.getElementById("postBodyInput");
            const cursorPos = ta.selectionStart;
            const textBefore = ta.value.substring(0, cursorPos);
            const textAfter = ta.value.substring(cursorPos);
            ta.value = `${textBefore}\n![이미지](${url})\n${textAfter}`;

            prog.textContent = "업로드 완료!";
            setTimeout(() => prog.textContent = "", 2000);
        } catch (err) {
            console.error(err);
            showToast("업로드 실패: " + err.message);
            prog.textContent = "";
        }
    }
};

function addImgPreview(url, path) {
    const list = document.getElementById("imgPreviewList");
    const item = document.createElement("div");
    item.className = "img-preview-item"; item.dataset.path = path;
    item.innerHTML = `<img src="${url}" alt=""><button class="remove-img" onclick="removeImageFromUI('${path}')">✕</button>`;
    list.appendChild(item);
}

// Unsigned 업로드는 클라이언트에서 삭제 API 호출이 제한되므로 UI에서만 제거
window.removeImageFromUI = function (path) {
    uploadedImages = uploadedImages.filter(i => i.path !== path);
    document.querySelector(`.img-preview-item[data-path="${path}"]`)?.remove();
    showToast("목록에서 제거되었습니다.");
};

// ── LOAD POSTS ────────────────────────────────────────
async function loadPosts() {
    try {
        const snap = await getDocs(query(postsCol, orderBy("createdAt", "desc")));
        posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderList();
    } catch (e) {
        document.getElementById("postList").innerHTML = `<div class="state-msg">🔥 데이터를 불러올 수 없습니다.<br><small style="color:#ff4444">${e.message}</small></div>`;
    }
}

function renderList() {
    const list = document.getElementById("postList");
    document.getElementById("postCount").textContent = `// ${posts.length} posts`;
    if (!posts.length) { list.innerHTML = `<div class="state-msg">아직 게시글이 없습니다.</div>`; document.getElementById("pagination").innerHTML = ""; return; }
    
    const start = (currentPage - 1) * PER_PAGE;
    list.innerHTML = posts.slice(start, start + PER_PAGE).map(p => {
        const imgMatch = (p.body || "").match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
        const thumb = imgMatch ? `<img class="post-thumb" src="${imgMatch[1]}" alt="">` : "";
        return `<div class="post-item" onclick="showDetail('${p.id}')">
      ${thumb}
      <div class="post-item-left" style="flex:1;">
        <div class="post-item-title">${escapeHtml(p.title)}</div>
        <div class="post-item-meta" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span>${formatDate(p.createdAt)}</span>${renderTags(p.tags || [])}
        </div>
      </div>
      <div class="post-item-actions" onclick="event.stopPropagation()">
        ${isAdmin ? `<button class="btn btn-sm" onclick="openEditModalById('${p.id}')">수정</button><button class="btn btn-sm btn-danger" onclick="confirmDeleteById('${p.id}')">삭제</button>` : ""}
      </div>
    </div>`;
    }).join("");
    renderPagination();
}

function renderPagination() {
    const total = Math.ceil(posts.length / PER_PAGE);
    if (total <= 1) { document.getElementById("pagination").innerHTML = ""; return; }
    document.getElementById("pagination").innerHTML = Array.from({ length: total }, (_, i) =>
        `<button class="page-btn ${i + 1 === currentPage ? "active" : ""}" onclick="goPage(${i + 1})">${i + 1}</button>`
    ).join("");
}

window.goPage = p => { currentPage = p; renderList(); };

// ── DETAIL ────────────────────────────────────────────
window.showDetail = function (id) {
    currentPost = posts.find(p => p.id === id); if (!currentPost) return;
    document.getElementById("detailTitle").textContent = currentPost.title;
    document.getElementById("detailMeta").innerHTML = `${formatDate(currentPost.createdAt)}&nbsp;&nbsp;${renderTags(currentPost.tags || [])}`;
    const bodyEl = document.getElementById("detailBody");
    bodyEl.innerHTML = marked.parse(currentPost.body || "");
    bodyEl.querySelectorAll("pre code").forEach(b => hljs.highlightElement(b));
    bodyEl.querySelectorAll("img").forEach(img => img.addEventListener("click", () => openLightbox(img.src)));
    document.getElementById("detailActions").style.display = isAdmin ? "flex" : "none";
    document.getElementById("listView").style.display = "none";
    document.getElementById("detailView").style.display = "block";
};

window.showList = function () { currentPost = null; document.getElementById("detailView").style.display = "none"; document.getElementById("listView").style.display = "block"; };

// ── 라이트박스 ────────────────────────────────────────
window.openLightbox = src => { document.getElementById("lightboxImg").src = src; document.getElementById("lightbox").classList.add("active"); };
window.closeLightbox = () => document.getElementById("lightbox").classList.remove("active");

// ── MODAL ─────────────────────────────────────────────
function resetModal() {
    uploadedImages = [];
    ["postTitleInput", "postTagInput", "postBodyInput"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("postBodyInput").style.display = "block";
    document.getElementById("mdPreview").classList.remove("active");
    document.querySelectorAll(".md-tab").forEach((t, i) => t.classList.toggle("active", i === 0));
    document.getElementById("imgPreviewList").innerHTML = "";
    document.getElementById("uploadProgress").textContent = "";
}

window.openWriteModal = function () {
    if (!isAdmin) { showToast("글쓰기 권한이 없습니다."); return; }
    editMode = false; resetModal();
    document.getElementById("modalTitle").textContent = "// 새 글 작성";
    document.getElementById("submitBtn").textContent = "작성";
    document.getElementById("writeModal").classList.add("active");
    document.getElementById("postTitleInput").focus();
};

window.openEditModal = () => currentPost && openEditModalById(currentPost.id);

window.openEditModalById = function (id) {
    if (!isAdmin) { showToast("권한이 없습니다."); return; }
    const p = posts.find(x => x.id === id); if (!p) return;
    currentPost = p; editMode = true; resetModal();
    uploadedImages = [...(p.images || [])];
    document.getElementById("modalTitle").textContent = "// 글 수정";
    document.getElementById("submitBtn").textContent = "수정";
    document.getElementById("postTitleInput").value = p.title;
    document.getElementById("postTagInput").value = (p.tags || []).join(", ");
    document.getElementById("postBodyInput").value = p.body;
    uploadedImages.forEach(img => addImgPreview(img.url, img.path));
    document.getElementById("writeModal").classList.add("active");
};

window.closeModal = () => document.getElementById("writeModal").classList.remove("active");

window.submitPost = async function () {
    if (!isAdmin) { showToast("권한이 없습니다."); return; }
    const title = document.getElementById("postTitleInput").value.trim();
    const body = document.getElementById("postBodyInput").value.trim();
    const tags = document.getElementById("postTagInput").value.split(",").map(t => t.trim()).filter(Boolean);
    if (!title) { showToast("제목을 입력해주세요."); return; }
    if (!body) { showToast("내용을 입력해주세요."); return; }
    
    const btn = document.getElementById("submitBtn");
    btn.disabled = true; btn.textContent = "처리 중...";
    
    try {
        const data = { title, body, tags, images: uploadedImages };
        if (editMode && currentPost) {
            await updateDoc(doc(db, "study_posts", currentPost.id), data);
            showToast("수정되었습니다.");
        } else {
            await addDoc(postsCol, { ...data, createdAt: serverTimestamp(), uid: currentUser.uid, userEmail: currentUser.email });
            showToast("작성되었습니다.");
        }
        closeModal(); await loadPosts();
    } catch (e) {
        showToast("오류: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = editMode ? "수정" : "작성";
    }
};

// ── DELETE ────────────────────────────────────────────
window.confirmDelete = () => document.getElementById("confirmModal").classList.add("active");
window.confirmDeleteById = function (id) { currentPost = posts.find(p => p.id === id); document.getElementById("confirmModal").classList.add("active"); };
window.closeConfirm = () => document.getElementById("confirmModal").classList.remove("active");

window.deletePost = async function () {
    if (!isAdmin || !currentPost) return;
    try {
        // Cloudinary는 보안상 클라이언트에서 이미지 물리적 삭제가 어렵습니다.
        // 여기서는 Firestore의 게시글 데이터만 삭제합니다.
        await deleteDoc(doc(db, "study_posts", currentPost.id));
        showToast("삭제되었습니다."); closeConfirm();
        if (document.getElementById("detailView").style.display !== "none") showList();
        await loadPosts();
    } catch (e) { showToast("삭제 실패: " + e.message); }
};

document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); closeConfirm(); closeLightbox(); } });
