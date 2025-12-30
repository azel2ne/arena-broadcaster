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
let isFilterActive = false;
let currentStickyColor = 'yellow'; // Default sticky color

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

// Trash
const trashZone = document.getElementById('trashZone');
const trashCan = document.querySelector('.trash-can');

// New Modal Elements
const stickyModal = document.getElementById('stickyModal');
const stickyText = document.getElementById('stickyText');
const linkModal = document.getElementById('linkModal');
const linkTitle = document.getElementById('linkTitle');
const linkUrl = document.getElementById('linkUrl');


// --- 1. Login & Logout ---
board.addEventListener('click', (e) => {
    if (e.target === board) {
        if (!currentUser) {
            loginModal.classList.remove('hidden');
        } else {
            showAllItems(); 
        }
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
        toolbar.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        trashZone.classList.add('hidden');
    }
});

function createNameTab(name) {
    const tab = document.createElement('div');
    tab.className = 'user-tab';
    tab.innerText = name;
    tab.onclick = (e) => { e.stopPropagation(); filterItemsBy(name); };
    userTabsContainer.appendChild(tab);
}

// --- 2. Item Creation & Modals ---

// -- Sticky Note Logic --
function openStickyModal() {
    stickyModal.classList.remove('hidden');
    stickyText.value = "";
    currentStickyColor = 'yellow'; // Reset to default
    // Reset visual selection in modal
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
        createItemElement('sticky', text, currentStickyColor);
        closeModal('stickyModal');
    } else {
        alert("Please write something!");
    }
}

// -- Link Logic --
function openLinkModal() {
    linkModal.classList.remove('hidden');
    linkTitle.value = "";
    linkUrl.value = "";
    linkTitle.focus();
}

function confirmLink() {
    const title = linkTitle.value;
    let url = linkUrl.value;
    if (title && url) {
        if (!url.startsWith('http')) url = 'https://' + url;
        createItemElement('link', { title: title, url: url });
        closeModal('linkModal');
    } else {
        alert("Please fill in both fields!");
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}


// -- Create Element Core --
function getRandomPosition() {
    const x = Math.random() * (window.innerWidth - 300);
    const y = Math.random() * (window.innerHeight - 300);
    const delay = Math.random() * 5; 
    return { x: x + 50, y: y + 50, delay }; 
}

function createItemElement(type, content, color = 'yellow') {
    if (!currentUser) return;

    const itemContainer = document.createElement('div');
    itemContainer.classList.add('item');
    itemContainer.setAttribute('data-owner', currentUser);
    
    itemContainer.reactionData = {}; 
    itemContainer.commentData = []; 

    const pos = getRandomPosition();
    itemContainer.style.left = `${pos.x}px`;
    itemContainer.style.top = `${pos.y}px`;
    itemContainer.style.animationDelay = `-${pos.delay}s`;

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';

    // Action Bar
    const actionBar = document.createElement('div');
    actionBar.className = 'item-actions';
    
    const commentBtn = document.createElement('button');
    commentBtn.className = 'action-btn';
    commentBtn.innerHTML = '<span class="material-icons-round">chat_bubble</span>';
    commentBtn.title = "Add Comment";
    commentBtn.onclick = (e) => { e.stopPropagation(); promptComment(itemContainer); };
    
    const emojiBtn = document.createElement('button');
    emojiBtn.className = 'action-btn';
    emojiBtn.innerHTML = '<span class="material-icons-round">add_reaction</span>';
    emojiBtn.title = "Add Reaction";
    emojiBtn.onclick = (e) => { e.stopPropagation(); promptEmoji(itemContainer); };

    actionBar.appendChild(commentBtn);
    actionBar.appendChild(emojiBtn);

    let innerContent;
    if (type === 'text') {
        innerContent = document.createElement('div');
        innerContent.className = 'item-text';
        innerContent.innerText = content;
    } 
    else if (type === 'sticky') {
        innerContent = document.createElement('div');
        // Apply color set during modal creation
        innerContent.className = `item-sticky bg-${color}`; 
        innerContent.innerText = content;
        // NO PALETTE BUTTON ADDED HERE anymore
    } 
    else if (type === 'img') {
        innerContent = document.createElement('img');
        innerContent.src = content;
        innerContent.className = 'item-img';
        innerContent.ondragstart = (e) => e.preventDefault();
    } 
    else if (type === 'video') {
        innerContent = document.createElement('video');
        innerContent.src = content;
        innerContent.controls = true;
        innerContent.className = 'item-video';
    } 
    else if (type === 'link') {
        innerContent = document.createElement('a');
        innerContent.href = content.url;
        innerContent.target = "_blank";
        innerContent.className = 'item-link';
        innerContent.innerHTML = `<span class="material-icons-round">link</span> <span class="link-text">${content.title}</span>`;
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

    makeDraggable(itemContainer);
    board.appendChild(itemContainer);
}

// --- 3. Interaction Logic ---

function promptComment(itemDiv) {
    const text = prompt("Add a comment:");
    if (!text) return;
    itemDiv.commentData.push({ user: currentUser, text: text });
    updateMetaAndComments(itemDiv);
}

function promptEmoji(itemDiv) {
    let msg = "Choose an emoji number:\n";
    EMOJI_LIST.forEach((em, i) => { msg += `${i+1}. ${em}\n`; });
    const choice = prompt(msg);
    if (!choice) return;
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < EMOJI_LIST.length) {
        const emoji = EMOJI_LIST[index];
        const data = itemDiv.reactionData;
        if (!data[emoji]) data[emoji] = [];
        if (!data[emoji].includes(currentUser)) {
            data[emoji].push(currentUser);
        } else {
            alert("You already reacted with this!");
            return;
        }
        updateMetaAndComments(itemDiv);
    }
}

function updateMetaAndComments(itemDiv) {
    const metaBar = itemDiv.querySelector('.meta-bar');
    const commentListDiv = itemDiv.querySelector('.comment-list');
    metaBar.innerHTML = ''; commentListDiv.innerHTML = '';

    const comments = itemDiv.commentData;
    if (comments.length > 0) {
        const cPill = document.createElement('div');
        cPill.className = 'pill comment-pill';
        cPill.innerHTML = `<span class="material-icons-round" style="font-size:14px">chat_bubble</span> ${comments.length}`;
        cPill.onclick = (e) => { e.stopPropagation(); commentListDiv.classList.toggle('show'); };
        metaBar.appendChild(cPill);
    }

    for (const [emoji, users] of Object.entries(itemDiv.reactionData)) {
        if (users.length === 0) continue;
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

// --- 4. Drag Logic ---
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
            if (owner === currentUser && isOverTrash(el)) deleteItem(el);
            else el.style.animation = 'floaty 8s ease-in-out infinite';
            trashCan.classList.remove('open');
        }
    });
}

// Trash Helpers
function getCenter(el) { const rect = el.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; }
function isOverTrash(el) {
    const elCenter = getCenter(el); const binRect = trashZone.getBoundingClientRect();
    return (elCenter.x > binRect.left - 20 && elCenter.x < binRect.right + 20 && elCenter.y > binRect.top - 20 && elCenter.y < binRect.bottom + 20);
}
function checkTrashCollision(el) { if (isOverTrash(el)) trashCan.classList.add('open'); else trashCan.classList.remove('open'); }
function deleteItem(el) { el.remove(); trashCan.classList.remove('open'); triggerSmoke(); }
function triggerSmoke() { trashZone.classList.remove('poof'); void trashZone.offsetWidth; trashZone.classList.add('poof'); }

// --- 5. Toolbar Wrappers ---
function addText() {
    const text = prompt("Enter your text:");
    if (text) createItemElement('text', text);
}
// OLD: addSticky() -> Replaced by openStickyModal() in HTML
// OLD: addLink() -> Replaced by openLinkModal() in HTML
function addSticky() { openStickyModal(); } 
function addLink() { openLinkModal(); }

function triggerUpload(type) {
    if (type === 'img') imgInput.click();
    if (type === 'video') videoInput.click();
}

imgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => createItemElement('img', ev.target.result);
        reader.readAsDataURL(file);
    }
    imgInput.value = ''; 
});

videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        createItemElement('video', url);
    }
    videoInput.value = '';
});

// --- 6. Filtering & Reset ---
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
    const items = document.querySelectorAll('.item');
    items.forEach(item => { item.style.display = 'flex'; item.style.opacity = '1'; });
}

resetBtn.addEventListener('click', () => { if(confirm("Clear the whole board?")) board.innerHTML = ''; });
showAllBtn.addEventListener('click', showAllItems);