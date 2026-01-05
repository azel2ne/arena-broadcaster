// --- 1. FIREBASE SETUP (Compat Version) ---
const firebaseConfig = {
    apiKey: "AIzaSyAtrkAzcyNg5yvnKBpc9LWU7CeoxL2LCUI",
    authDomain: "arena-broadcaster.firebaseapp.com",
    databaseURL: "https://arena-broadcaster-default-rtdb.firebaseio.com",
    projectId: "arena-broadcaster",
    storageBucket: "arena-broadcaster.firebasestorage.app",
    messagingSenderId: "345329587638",
    appId: "1:345329587638:web:e0a0f8f11a75fdb5a31d17"
};

// Initialize
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const itemsRef = db.ref('items'); 

// --- Configuration ---
const USERS = {
    "naeun": "1111",
    "namkyu": "2222",
    "zeline": "3333",
    "eroon": "0000"
};
const EMOJI_LIST = ["❤️", "🔥", "😂", "👍", "😮", "💩"];

// --- State ---
let currentUser = null;
let signedInUsers = new Set();
let currentStickyColor = 'yellow'; 

// --- DOM Elements ---
const board = document.getElementById('board');
const loginModal = document.getElementById('loginModal');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');
const userTabsContainer = document.getElementById('userTabsContainer');
const toolbar = document.getElementById('toolbar');
const resetBtn = document.getElementById('resetBtn');
const showAllBtn = document.getElementById('showAllBtn');
const logoutBtn = document.getElementById('logoutBtn');
const imgInput = document.getElementById('imgInput');
const videoInput = document.getElementById('videoInput');
const trashZone = document.getElementById('trashZone');
const trashCan = document.querySelector('.trash-can');
const stickyModal = document.getElementById('stickyModal');
const stickyText = document.getElementById('stickyText');
const linkModal = document.getElementById('linkModal');
const linkTitle = document.getElementById('linkTitle');
const linkUrl = document.getElementById('linkUrl');


// --- 2. LOGIN & AUTH (UPDATED with Persistence) ---

// Check for saved user on load
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('board_user');
    if (savedUser) {
        signInSuccess(savedUser);
    }
});

document.getElementById('loginBtn').addEventListener('click', () => {
    const u = usernameInput.value;
    const p = passwordInput.value;
    if (USERS.hasOwnProperty(u) && USERS[u] === p) {
        signInSuccess(u);
    } else {
        loginError.textContent = "Wrong username or password.";
    }
});

function signInSuccess(user) {
    currentUser = user;
    
    // SAVE TO STORAGE
    localStorage.setItem('board_user', user);

    loginModal.classList.add('hidden');
    toolbar.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    trashZone.classList.remove('hidden'); 
    
    usernameInput.value = ''; passwordInput.value = ''; loginError.textContent = '';
    if (!signedInUsers.has(user)) {
        signedInUsers.add(user);
        createNameTab(user);
    }
}

logoutBtn.addEventListener('click', () => {
    if(confirm("Log out?")) {
        currentUser = null;
        
        // REMOVE FROM STORAGE
        localStorage.removeItem('board_user');

        toolbar.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        trashZone.classList.add('hidden');
        loginModal.classList.remove('hidden');
        
        // Reset tabs active state
        showAllItems();
    }
});

function createNameTab(name) {
    const existing = Array.from(document.querySelectorAll('.user-tab')).find(el => el.innerText === name);
    if(existing) return;

    const tab = document.createElement('div');
    tab.className = 'user-tab';
    tab.innerText = name;
    
    // UPDATED CLICK LOGIC FOR HIGHLIGHTING
    tab.onclick = (e) => { 
        e.stopPropagation(); 
        
        // Remove active class from all tabs
        document.querySelectorAll('.user-tab').forEach(t => t.classList.remove('active-tab'));
        // Add active class to clicked tab
        tab.classList.add('active-tab');
        
        filterItemsBy(name); 
    };
    
    userTabsContainer.appendChild(tab);
}


// --- 3. FIREBASE LISTENERS ---

itemsRef.on('child_added', (snapshot) => {
    const itemData = snapshot.val();
    const itemId = snapshot.key;
    renderItem(itemId, itemData);
    
    if(itemData.owner && !signedInUsers.has(itemData.owner)) {
        signedInUsers.add(itemData.owner);
        createNameTab(itemData.owner);
    }
});

itemsRef.on('child_changed', (snapshot) => {
    const itemData = snapshot.val();
    const itemId = snapshot.key;
    const el = document.getElementById(itemId);
    
    if (el) {
        el.style.left = `${itemData.x}px`;
        el.style.top = `${itemData.y}px`;
        el.reactionData = itemData.reactionData || {};
        el.commentData = itemData.commentData || [];
        updateMetaAndComments(el);
    }
});

itemsRef.on('child_removed', (snapshot) => {
    const itemId = snapshot.key;
    const el = document.getElementById(itemId);
    if (el) el.remove();
});


// --- 4. DATA SAVING ---

function getRandomPosition() {
    const x = Math.random() * (window.innerWidth - 300);
    const y = Math.random() * (window.innerHeight - 300);
    return { x: x + 50, y: y + 50 }; 
}

function saveItemToDB(type, content, extra = {}) {
    if (!currentUser) return;

    const pos = getRandomPosition();
    const newItemRef = itemsRef.push();
    
    const data = {
        type: type,
        content: content,
        x: pos.x,
        y: pos.y,
        owner: currentUser,
        reactionData: {},
        commentData: [],
        ...extra 
    };

    newItemRef.set(data);
}

// --- 5. RENDER LOGIC ---

function renderItem(id, data) {
    const itemContainer = document.createElement('div');
    itemContainer.classList.add('item');
    itemContainer.setAttribute('data-owner', data.owner);
    itemContainer.id = id; 
    
    itemContainer.reactionData = data.reactionData || {};
    itemContainer.commentData = data.commentData || [];

    itemContainer.style.left = `${data.x}px`;
    itemContainer.style.top = `${data.y}px`;
    itemContainer.style.animationDelay = `-${Math.random() * 5}s`;

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';

    // Action Bar
    const actionBar = document.createElement('div');
    actionBar.className = 'item-actions';
    
    const commentBtn = document.createElement('button');
    commentBtn.className = 'action-btn';
    commentBtn.innerHTML = '<span class="material-icons-round">chat_bubble</span>';
    commentBtn.onclick = (e) => { e.stopPropagation(); promptComment(id, itemContainer); };
    
    const emojiBtn = document.createElement('button');
    emojiBtn.className = 'action-btn';
    emojiBtn.innerHTML = '<span class="material-icons-round">add_reaction</span>';
    emojiBtn.onclick = (e) => { e.stopPropagation(); promptEmoji(id, itemContainer); };

    actionBar.appendChild(commentBtn);
    actionBar.appendChild(emojiBtn);

    let innerContent;
    if (data.type === 'text') {
        innerContent = document.createElement('div');
        innerContent.className = 'item-text';
        innerContent.innerText = data.content;
    } 
    else if (data.type === 'sticky') {
        innerContent = document.createElement('div');
        innerContent.className = `item-sticky bg-${data.color || 'yellow'}`; 
        innerContent.innerText = data.content;
    } 
    else if (data.type === 'img') {
        innerContent = document.createElement('img');
        innerContent.src = data.content;
        innerContent.className = 'item-img';
        innerContent.ondragstart = (e) => e.preventDefault();
    } 
    else if (data.type === 'video') {
        innerContent = document.createElement('video');
        innerContent.src = data.content;
        innerContent.controls = true;
        innerContent.className = 'item-video';
    } 
    else if (data.type === 'link') {
        innerContent = document.createElement('a');
        innerContent.href = data.content.url;
        innerContent.target = "_blank";
        innerContent.className = 'item-link';
        innerContent.innerHTML = `<span class="material-icons-round">link</span> <span class="link-text">${data.content.title}</span>`;
    }
    
    contentWrapper.appendChild(innerContent);
    contentWrapper.appendChild(actionBar);
    itemContainer.appendChild(contentWrapper);

    const metaBar = document.createElement('div');
    metaBar.className = 'meta-bar';
    itemContainer.appendChild(metaBar);

    const commentList = document.createElement('div');
    commentList.className = 'comment-list';
    itemContainer.appendChild(commentList);

    updateMetaAndComments(itemContainer);
    makeDraggable(itemContainer);
    board.appendChild(itemContainer);
}

// --- 6. INTERACTIONS ---

function promptComment(itemId, itemDiv) {
    if (!currentUser) return; 
    const text = prompt("Add a comment:");
    if (!text) return;

    const newComments = [...(itemDiv.commentData || [])];
    newComments.push({ user: currentUser, text: text });

    db.ref('items/' + itemId).update({
        commentData: newComments
    });
}

function promptEmoji(itemId, itemDiv) {
    if (!currentUser) return;
    let msg = "Choose an emoji number:\n";
    EMOJI_LIST.forEach((em, i) => { msg += `${i+1}. ${em}\n`; });
    const choice = prompt(msg);
    if (!choice) return;
    const index = parseInt(choice) - 1;
    
    if (index >= 0 && index < EMOJI_LIST.length) {
        const emoji = EMOJI_LIST[index];
        const data = itemDiv.reactionData || {};
        
        if (!data[emoji]) data[emoji] = [];
        if (!data[emoji].includes(currentUser)) {
            data[emoji].push(currentUser);
            db.ref('items/' + itemId).update({ reactionData: data });
        } else {
            alert("You already reacted with this!");
        }
    }
}

function updateMetaAndComments(itemDiv) {
    const metaBar = itemDiv.querySelector('.meta-bar');
    const commentListDiv = itemDiv.querySelector('.comment-list');
    metaBar.innerHTML = ''; commentListDiv.innerHTML = '';

    const comments = itemDiv.commentData || [];
    if (comments.length > 0) {
        const cPill = document.createElement('div');
        cPill.className = 'pill comment-pill';
        cPill.innerHTML = `<span class="material-icons-round" style="font-size:14px">chat_bubble</span> ${comments.length}`;
        cPill.onclick = (e) => { e.stopPropagation(); commentListDiv.classList.toggle('show'); };
        metaBar.appendChild(cPill);
    }

    const reactions = itemDiv.reactionData || {};
    for (const [emoji, users] of Object.entries(reactions)) {
        if (!users || users.length === 0) continue;
        const pill = document.createElement('div');
        pill.className = 'pill';
        pill.innerHTML = `${emoji} ${users.length}`;
        pill.onclick = (e) => { e.stopPropagation(); alert(`${emoji} by:\n${users.join(', ')}`); };
        metaBar.appendChild(pill);
    }

    comments.forEach(c => {
        const bubble = document.createElement('div');
        bubble.className = 'comment-bubble';
        bubble.innerHTML = `<b>${c.user}:</b> ${c.text}`;
        commentListDiv.appendChild(bubble);
    });
}

// --- 7. DRAG LOGIC ---

function makeDraggable(el) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    el.addEventListener('mousedown', (e) => {
        if(e.target.closest('.item-actions') || e.target.closest('.meta-bar') || e.target.closest('.comment-list') || e.target.tagName === 'A' || e.target.tagName === 'VIDEO') return;
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        initialLeft = el.offsetLeft; initialTop = el.offsetTop;
        el.style.animation = 'none'; el.style.zIndex = '9999';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX; const dy = e.clientY - startY;
        el.style.left = `${initialLeft + dx}px`; el.style.top = `${initialTop + dy}px`;
        const owner = el.getAttribute('data-owner');
        if (owner === currentUser) checkTrashCollision(el);
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false; el.style.zIndex = '10';
            const owner = el.getAttribute('data-owner');
            
            if (owner === currentUser && isOverTrash(el)) {
                deleteItem(el.id); 
            } else {
                el.style.animation = 'floaty 8s ease-in-out infinite';
                if (owner === currentUser) {
                    db.ref('items/' + el.id).update({
                        x: parseInt(el.style.left),
                        y: parseInt(el.style.top)
                    });
                }
            }
            trashCan.classList.remove('open');
        }
    });
}

function getCenter(el) { const rect = el.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; }
function isOverTrash(el) {
    const elCenter = getCenter(el); const binRect = trashZone.getBoundingClientRect();
    return (elCenter.x > binRect.left - 20 && elCenter.x < binRect.right + 20 && elCenter.y > binRect.top - 20 && elCenter.y < binRect.bottom + 20);
}
function checkTrashCollision(el) { if (isOverTrash(el)) trashCan.classList.add('open'); else trashCan.classList.remove('open'); }

function deleteItem(itemId) {
    db.ref('items/' + itemId).remove();
    trashCan.classList.remove('open');
    triggerSmoke();
}
function triggerSmoke() { trashZone.classList.remove('poof'); void trashZone.offsetWidth; trashZone.classList.add('poof'); }

// --- 8. GLOBAL FUNCTIONS ---

function addText() {
    const text = prompt("Enter your text:");
    if (text) saveItemToDB('text', text);
}

function openStickyModal() {
    stickyModal.classList.remove('hidden');
    stickyText.value = "";
    currentStickyColor = 'yellow'; 
    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    document.querySelector('.color-option.bg-yellow').classList.add('selected');
    stickyText.focus();
}

function selectStickyColor(color, element) {
    currentStickyColor = color;
    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
}

function confirmSticky() {
    const text = stickyText.value;
    if(text.trim()) {
        saveItemToDB('sticky', text, { color: currentStickyColor });
        document.getElementById('stickyModal').classList.add('hidden');
    } else {
        alert("Please write something!");
    }
}

function openLinkModal() {
    linkModal.classList.remove('hidden');
    linkTitle.value = ""; linkUrl.value = ""; linkTitle.focus();
}

function confirmLink() {
    const title = linkTitle.value;
    let url = linkUrl.value;
    if (title && url) {
        if (!url.startsWith('http')) url = 'https://' + url;
        saveItemToDB('link', { title, url });
        document.getElementById('linkModal').classList.add('hidden');
    } else {
        alert("Please fill in both fields!");
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function triggerUpload(type) {
    if (type === 'img') imgInput.click();
    if (type === 'video') videoInput.click();
}

imgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => saveItemToDB('img', ev.target.result);
        reader.readAsDataURL(file);
    }
    imgInput.value = ''; 
});

videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        saveItemToDB('video', url);
    }
    videoInput.value = '';
});

function filterItemsBy(user) {
    isFilterActive = true;
    const items = document.querySelectorAll('.item');
    items.forEach(item => {
        if (item.getAttribute('data-owner') === user) { item.style.display = 'flex'; item.style.opacity = '1'; }
        else { item.style.display = 'none'; }
    });
}

function showAllItems() {
    isFilterActive = false;
    
    // UI RESET: Remove active state from tabs
    document.querySelectorAll('.user-tab').forEach(t => t.classList.remove('active-tab'));
    
    const items = document.querySelectorAll('.item');
    items.forEach(item => { item.style.display = 'flex'; item.style.opacity = '1'; });
}

resetBtn.addEventListener('click', () => {
    if(confirm("Clear the whole board for EVERYONE?")) {
        itemsRef.set(null); 
    }
});
showAllBtn.addEventListener('click', window.showAllItems);