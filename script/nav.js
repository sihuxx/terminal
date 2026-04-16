import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 🔥 Firebase 설정 (auth.js, board.js와 동일하게)
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
const auth = getAuth(app);

// 헤더 UI 업데이트 함수
const updateHeader = (user) => {
    const headerUser = document.getElementById("headerUser");
    if (!headerUser) return;

    if (user) {
        // 로그인 상태: 이메일과 로그아웃 버튼 표시
        headerUser.innerHTML = `
            <span class="user-email" style="margin-right: 10px; font-size: 0.8rem;">${user.email}</span>
            <button id="logoutBtn" class="logout-btn" >로그아웃</button>
        `;
        document.getElementById("logoutBtn").addEventListener("click", () => {
            signOut(auth).then(() => {
                window.location.reload();
            });
        });
    } else {
        // 로그아웃 상태: 로그인 링크 표시
        headerUser.innerHTML = `<a href="./login.html" class="login-link">로그인</a>`;
    }
};

// 인증 상태 감시
onAuthStateChanged(auth, (user) => {
    updateHeader(user);
});