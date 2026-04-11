  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
    import {
      getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
      query, orderBy, serverTimestamp
    } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
    import {
      getAuth, onAuthStateChanged, signOut
    } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const postsCol = collection(db, "posts");

    // ── STATE ─────────────────────────────────────────────
    let posts = [];
    let currentPost = null;
    let editMode = false;
    let currentUser = null;
    const PER_PAGE = 10;
    let currentPage = 1;

    // ── AUTH 상태 감지 ─────────────────────────────────────
    onAuthStateChanged(auth, user => {
      currentUser = user;
      renderHeaderUser(user);
    });

    function renderHeaderUser(user) {
      const el = document.getElementById("headerUser");
      if (user) {
        el.innerHTML = `
          <span class="user-email">> ${user.email}</span>
          <button class="logout-btn" id="logoutBtn">로그아웃</button>
        `;
        document.getElementById("logoutBtn").addEventListener("click", async () => {
          await signOut(auth);
          showToast("로그아웃 되었습니다.");
        });
      } else {
        el.innerHTML = `<a href="./login.html" class="login-link">로그인</a>`;
      }
    }

    // ── UTILS ─────────────────────────────────────────────
    function showToast(msg) {
      const t = document.getElementById("toast");
      t.textContent = msg;
      t.classList.add("show");
      setTimeout(() => t.classList.remove("show"), 2500);
    }

    function formatDate(ts) {
      if (!ts) return "";
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    }

    function escapeHtml(str = "") {
      return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    }

    // ── LOAD POSTS ────────────────────────────────────────
    async function loadPosts() {
      try {
        const q = query(postsCol, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderList();
      } catch(e) {
        document.getElementById("postList").innerHTML =
          `<div class="state-msg">🔥 Firebase 설정을 확인해주세요.<br><small style="color:#ff4444">${e.message}</small></div>`;
      }
    }

    function renderList() {
      const list = document.getElementById("postList");
      document.getElementById("postCount").textContent = `// ${posts.length} posts`;

      if (posts.length === 0) {
        list.innerHTML = `<div class="state-msg">아직 게시글이 없습니다.<br><small>첫 글을 작성해보세요!</small></div>`;
        document.getElementById("pagination").innerHTML = "";
        return;
      }

      const start = (currentPage - 1) * PER_PAGE;
      const pagePosts = posts.slice(start, start + PER_PAGE);

      list.innerHTML = pagePosts.map(p => {
        const isOwner = currentUser && currentUser.uid === p.uid;
        return `
        <div class="post-item" onclick="showDetail('${p.id}')">
          <div class="post-item-left">
            <div class="post-item-title">${escapeHtml(p.title)}</div>
            <div class="post-item-meta">${escapeHtml(p.author || "익명")} · ${formatDate(p.createdAt)}</div>
          </div>
          <div class="post-item-actions" onclick="event.stopPropagation()">
            ${isOwner ? `
              <button class="btn btn-sm" onclick="openEditModalById('${p.id}')">수정</button>
              <button class="btn btn-sm btn-danger" onclick="confirmDeleteById('${p.id}')">삭제</button>
            ` : ""}
          </div>
        </div>`;
      }).join("");

      renderPagination();
    }

    function renderPagination() {
      const total = Math.ceil(posts.length / PER_PAGE);
      if (total <= 1) { document.getElementById("pagination").innerHTML = ""; return; }
      let html = "";
      for (let p = 1; p <= total; p++) {
        html += `<button class="page-btn ${p === currentPage ? "active" : ""}" onclick="goPage(${p})">${p}</button>`;
      }
      document.getElementById("pagination").innerHTML = html;
    }

    window.goPage = p => { currentPage = p; renderList(); };

    // ── DETAIL ────────────────────────────────────────────
    window.showDetail = function(id) {
      currentPost = posts.find(p => p.id === id);
      if (!currentPost) return;
      document.getElementById("detailTitle").textContent = currentPost.title;
      document.getElementById("detailMeta").textContent =
        `${currentPost.author || "익명"} · ${formatDate(currentPost.createdAt)}` +
        (currentPost.userEmail ? `  [${currentPost.userEmail}]` : "");
      document.getElementById("detailBody").textContent = currentPost.body;
      // 본인 글일 때만 수정/삭제 버튼 표시
      const isOwner = currentUser && currentUser.uid === currentPost.uid;
      document.querySelector(".post-detail-actions").style.display = isOwner ? "flex" : "none";
      document.getElementById("listView").style.display = "none";
      document.getElementById("detailView").style.display = "block";
    };

    window.showList = function() {
      currentPost = null;
      document.getElementById("detailView").style.display = "none";
      document.getElementById("listView").style.display = "block";
    };

    // ── WRITE MODAL ───────────────────────────────────────
    window.openWriteModal = function() {
      editMode = false;
      document.getElementById("modalTitle").textContent = "// 새 글 작성";
      document.getElementById("submitBtn").textContent = "작성";
      document.getElementById("postTitleInput").value = "";
      // 로그인 상태면 작성자 자동 입력
      document.getElementById("postAuthorInput").value = currentUser ? currentUser.email.split("@")[0] : "";
      document.getElementById("postBodyInput").value = "";
      document.getElementById("writeModal").classList.add("active");
      document.getElementById("postTitleInput").focus();
    };

    window.openEditModal = () => currentPost && openEditModalById(currentPost.id);

    window.openEditModalById = function(id) {
      const p = posts.find(x => x.id === id);
      if (!p) return;
      if (!currentUser || currentUser.uid !== p.uid) {
        showToast("본인 글만 수정할 수 있습니다.");
        return;
      }
      currentPost = p;
      editMode = true;
      document.getElementById("modalTitle").textContent = "// 글 수정";
      document.getElementById("submitBtn").textContent = "수정";
      document.getElementById("postTitleInput").value = p.title;
      document.getElementById("postAuthorInput").value = p.author || "";
      document.getElementById("postBodyInput").value = p.body;
      document.getElementById("writeModal").classList.add("active");
      document.getElementById("postTitleInput").focus();
    };

    window.closeModal = () => document.getElementById("writeModal").classList.remove("active");

    window.submitPost = async function() {
      const title = document.getElementById("postTitleInput").value.trim();
      const author = document.getElementById("postAuthorInput").value.trim();
      const body = document.getElementById("postBodyInput").value.trim();
      if (!title) { showToast("제목을 입력해주세요."); return; }
      if (!body)  { showToast("내용을 입력해주세요.");  return; }

      const btn = document.getElementById("submitBtn");
      btn.disabled = true;
      btn.textContent = "처리 중...";

      try {
        if (editMode && currentPost) {
          await updateDoc(doc(db, "posts", currentPost.id), { title, author, body });
          showToast("수정되었습니다.");
          currentPost = { ...currentPost, title, author, body };
          document.getElementById("detailTitle").textContent = title;
          document.getElementById("detailBody").textContent = body;
        } else {
          await addDoc(postsCol, {
            title, author, body,
            createdAt: serverTimestamp(),
            // 로그인 상태면 uid/email 함께 저장
            uid: currentUser ? currentUser.uid : null,
            userEmail: currentUser ? currentUser.email : null,
          });
          showToast("작성되었습니다.");
        }
        closeModal();
        await loadPosts();
      } catch(e) {
        showToast("오류: " + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = editMode ? "수정" : "작성";
      }
    };

    // ── DELETE ────────────────────────────────────────────
    window.confirmDelete = () => document.getElementById("confirmModal").classList.add("active");

    window.confirmDeleteById = function(id) {
      currentPost = posts.find(p => p.id === id);
      document.getElementById("confirmModal").classList.add("active");
    };

    window.closeConfirm = () => document.getElementById("confirmModal").classList.remove("active");

    window.deletePost = async function() {
      if (!currentPost) return;
      if (!currentUser || currentUser.uid !== currentPost.uid) {
        showToast("본인 글만 삭제할 수 있습니다.");
        closeConfirm();
        return;
      }
      try {
        await deleteDoc(doc(db, "posts", currentPost.id));
        showToast("삭제되었습니다.");
        closeConfirm();
        if (document.getElementById("detailView").style.display !== "none") showList();
        await loadPosts();
      } catch(e) {
        showToast("삭제 실패: " + e.message);
      }
    };

    // ── ESC 닫기 ──────────────────────────────────────────
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { closeModal(); closeConfirm(); }
    });

    // ── INIT ──────────────────────────────────────────────
    loadPosts();