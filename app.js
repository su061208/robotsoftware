const firebaseConfig = {
    apiKey: "AIzaSyDjxnrBqLy33FwJ83XpHKFXtcfzTVpwgIA",
    authDomain: "robot-23f53.firebaseapp.com",
    projectId: "robot-23f53",
    storageBucket: "robot-23f53.firebasestorage.app",
    messagingSenderId: "607018765155",
    appId: "1:607018765155:web:e05dfe238360b6951de156"
};

// Initialize Firebase using compat mode (works locally without a server)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// State Management
let posts = [];

// Initialize posts from Firebase
async function initPosts() {
    posts = [];
    try {
        const querySnapshot = await db.collection("posts").orderBy("id", "desc").get();
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            data.docId = doc.id; // Store Firestore Document ID
            posts.push(data);
        });
        renderPosts();
    } catch (error) {
        console.error("Firebase 로드 에러:", error);
        // If collection doesn't exist or permission denied, empty posts list will show
        renderPosts();
    }
}

// Modal Control
function showWriteModal(postId = null) {
    const modal = document.getElementById('post-modal');
    const titleInput = document.getElementById('post-title');
    const authorInput = document.getElementById('post-author');
    const passwordInput = document.getElementById('post-password');
    const contentInput = document.getElementById('post-content');
    const idInput = document.getElementById('post-id');
    const modalTitle = document.getElementById('modal-title');
    
    // Position modal at current scroll height for mobile compatibility
    modal.style.top = window.scrollY + 'px';

    if (postId) {
        // Edit mode (Check Password)
        const post = posts.find(p => p.id === postId);
        if (post) {
            const enteredPwd = prompt("게시글 수정: 비밀번호를 입력해주세요.");
            if (enteredPwd === null) return; 
            if (enteredPwd !== post.password && post.password) {
                alert("비밀번호가 일치하지 않습니다.");
                return; 
            }
            
            // Password correct! Unlock modal
            modalTitle.innerText = "글 수정하기";
            titleInput.value = post.title;
            authorInput.value = post.author;
            passwordInput.value = post.password || "";
            contentInput.value = post.content;
            idInput.value = post.id;
            modal.classList.add('active');
        }
    } else {
        // Write mode
        modalTitle.innerText = "새 글 쓰기";
        titleInput.value = "";
        authorInput.value = "";
        passwordInput.value = "";
        contentInput.value = "";
        idInput.value = "";
        modal.classList.add('active');
    }
}

function closeModal() {
    const modal = document.getElementById('post-modal');
    modal.classList.remove('active');
}

// Post CRUD Operations
async function savePost() {
    const title = document.getElementById('post-title').value.trim();
    const author = document.getElementById('post-author').value.trim();
    const password = document.getElementById('post-password').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const id = document.getElementById('post-id').value;

    if (!title || !author || !password || !content) {
        alert("모든 항목(비밀번호 포함)을 입력해주세요.");
        return;
    }

    // Disable button to prevent multiple clicks
    const saveBtn = document.querySelector('.modal-footer .btn.primary');
    saveBtn.innerText = "저장 중...";
    saveBtn.disabled = true;

    try {
        if (id) {
            // Update existing post
            const post = posts.find(p => p.id === parseInt(id));
            if (post) {
                await db.collection("posts").doc(post.docId).update({
                    title: title,
                    author: author,
                    password: password,
                    content: content
                });
                alert("글이 수정되었습니다.");
            }
        } else {
            // Create new post
            const newPost = {
                id: Date.now(),
                title: title,
                author: author,
                password: password,
                content: content,
                date: new Date().toLocaleDateString('ko-KR').replace(/ /g, ''),
                comments: []
            };
            await db.collection("posts").add(newPost);
            alert("글이 등록되었습니다.");
        }
        
        closeModal();
        await initPosts(); // Reload from Firebase
    } catch (e) {
        console.error("저장 에러: ", e);
        alert("저장에 실패했습니다. DB 환경이나 보안 규칙을 확인해주세요.");
    } finally {
        saveBtn.innerText = "저장";
        saveBtn.disabled = false;
    }
}

async function deletePost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    
    const enteredPwd = prompt("게시글 삭제: 비밀번호를 입력해주세요.");
    if (enteredPwd === null) return;
    if (enteredPwd !== post.password && post.password) {
        alert("비밀번호가 일치하지 않습니다.");
        return;
    }

    if (confirm("정말로 이 글을 삭제하시겠습니까? (삭제 시 복구할 수 없습니다)")) {
        try {
            await db.collection("posts").doc(post.docId).delete();
            alert("삭제되었습니다.");
            await initPosts();
        } catch (e) {
            console.error("삭제 에러: ", e);
            alert("삭제에 실패했습니다.");
        }
    }
}

function togglePostContent(id) {
    const contentDiv = document.getElementById(`post-content-${id}`);
    if (contentDiv.style.display === 'block') {
        contentDiv.style.display = 'none';
    } else {
        contentDiv.style.display = 'block';
    }
}

// Comments CRUD
async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const pwdInput = document.getElementById(`comment-pwd-${postId}`);
    const text = input.value.trim();
    const password = pwdInput.value.trim();
    const author = "익명"; 

    if (!text || !password) {
        alert("댓글 내용과 비밀번호를 모두 입력해주세요.");
        return;
    }

    const post = posts.find(p => p.id === postId);
    if (post) {
        try {
            const newComments = [...(post.comments || []), {
                id: Date.now(),
                author: author,
                password: password,
                text: text
            }];

            await db.collection("posts").doc(post.docId).update({ 
                comments: newComments 
            });
            
            input.value = "";
            pwdInput.value = "";
            await initPosts();
            
            // Keep content open after re-render
            setTimeout(() => {
                const contentDiv = document.getElementById(`post-content-${postId}`);
                if (contentDiv) contentDiv.style.display = 'block';
            }, 50);
        } catch(e) {
            console.error("댓글 에러: ", e);
            alert("댓글 등록에 실패했습니다.");
        }
    }
}

async function deleteComment(postId, commentId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const comment = post.comments.find(c => c.id === commentId);
    if (!comment) return;

    const enteredPwd = prompt("댓글 삭제: 비밀번호를 입력해주세요.");
    if (enteredPwd === null) return;
    if (enteredPwd !== comment.password && comment.password) {
        alert("비밀번호가 일치하지 않습니다.");
        return;
    }

    if (confirm("댓글을 삭제하시겠습니까?")) {
        try {
            const newComments = post.comments.filter(c => c.id !== commentId);
            await db.collection("posts").doc(post.docId).update({ 
                comments: newComments 
            });
            
            await initPosts();

            setTimeout(() => {
                const contentDiv = document.getElementById(`post-content-${postId}`);
                if (contentDiv) contentDiv.style.display = 'block';
            }, 50);
        } catch(e) {
            console.error("댓글 삭제 에러: ", e);
            alert("삭제에 실패했습니다.");
        }
    }
}

// Rendering
function renderPosts() {
    const postList = document.getElementById('post-list');
    if (!postList) return; // Not on the board page

    postList.innerHTML = '';

    if (posts.length === 0) {
        postList.innerHTML = '<div class="empty-state">등록된 글이 아직 없습니다. 첫 글의 주인공이 되어보세요!</div>';
        return;
    }

    posts.forEach(post => {
        // Render comments
        let commentsHtml = '';
        if (post.comments && post.comments.length > 0) {
            commentsHtml = post.comments.map(comment => `
                <div class="comment-item">
                    <div>
                        <div class="comment-author">${comment.author}</div>
                        <div class="comment-text">${comment.text}</div>
                    </div>
                    <button class="action-btn delete" title="댓글 삭제" onclick="deleteComment(${post.id}, ${comment.id})">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `).join('');
        }

        const postElement = document.createElement('div');
        postElement.className = 'post-item';
        postElement.innerHTML = `
            <div class="post-header">
                <div class="post-title" onclick="togglePostContent(${post.id})">${post.title} <span style="color:var(--primary-color); font-size:14px; font-weight:normal;">[${post.comments ? post.comments.length : 0}]</span></div>
                <div class="post-meta">${post.author} | ${post.date}</div>
            </div>
            
            <div class="post-content-display" id="post-content-${post.id}">
                <div style="min-height: 50px; white-space: pre-wrap; margin-bottom: 20px;">${post.content}</div>
                
                <div class="post-actions">
                    <button class="action-btn" onclick="showWriteModal(${post.id})"><i class="fa-solid fa-pen"></i> 수정</button>
                    <button class="action-btn delete" onclick="deletePost(${post.id})"><i class="fa-solid fa-trash"></i> 삭제</button>
                </div>

                <div class="comments-section">
                    <h4>댓글</h4>
                    <div style="margin-top:10px;">${commentsHtml}</div>
                    <div class="comment-input-area">
                        <input type="text" id="comment-input-${post.id}" placeholder="댓글 내용..." style="flex: 2;" onkeypress="if(event.key === 'Enter') addComment(${post.id})">
                        <input type="password" id="comment-pwd-${post.id}" placeholder="비밀번호" style="flex: 1;" onkeypress="if(event.key === 'Enter') addComment(${post.id})">
                        <button class="btn secondary" onclick="addComment(${post.id})">등록</button>
                    </div>
                </div>
            </div>
        `;
        postList.appendChild(postElement);
    });
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if(document.getElementById('post-list')) initPosts();
    });
} else {
    if(document.getElementById('post-list')) initPosts();
}
