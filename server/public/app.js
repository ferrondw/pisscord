const socket = io('https://pisscord.onrender.com')

const messageInput = document.querySelector('#message')
const nameInput = document.querySelector('#name')
const roomInput = document.querySelector('#room')
const activity = document.querySelector('.activity')
const usersList = document.querySelector('.user-list')
const roomList = document.querySelector('.room-list')
const chatDisplay = document.querySelector('.chat-display')

const ADMIN = "this string is longer then 20 characters so i don't think any user can pick this one";

function sendMessage(e) {
    e.preventDefault()
    if (nameInput.value && messageInput.value && roomInput.value) {
        socket.emit('message', {
            name: nameInput.value,
            text: messageInput.value
        })
        messageInput.value = ""
    }
    messageInput.focus()
}

function enterRoom(e) {
    e.preventDefault()
    if (nameInput.value && roomInput.value) {
        socket.emit('enterRoom', {
            name: nameInput.value,
            room: roomInput.value
        })
    }
}

document.querySelector('.form-msg')
    .addEventListener('submit', sendMessage)

document.querySelector('.form-join')
    .addEventListener('submit', enterRoom)

messageInput.addEventListener('keypress', () => {
    socket.emit('activity', nameInput.value)
})

// Listen for messages 
socket.on("message", (data) => {
    activity.textContent = ""
    const { name, text, time } = data
    const post = document.createElement('li')
    post.className = 'post'
    if (name === nameInput.value) post.className = 'post post--right'
    if (name !== nameInput.value && name !== ADMIN) post.className = 'post post--left'

    const content = embedContent(text);

    if (name !== ADMIN) {
        post.innerHTML = `<div class="post__header ${name === nameInput.value
            ? 'post__header--user'
            : 'post__header--reply'
            }">
        <span class="post__header--name">${name}</span> 
        <span class="post__header--time">${time}</span> 
        </div>
        <div class="post__text">${content}</div>`
    } else {
        post.innerHTML = `<div class="post__text--admin">${content}</div>`
    }
    document.querySelector('.chat-display').appendChild(post)

    chatDisplay.scrollTop = chatDisplay.scrollHeight
})

let activityTimer
socket.on("activity", (name) => {
    activity.textContent = `${name} is typing...`

    // Clear after 3 seconds 
    clearTimeout(activityTimer)
    activityTimer = setTimeout(() => {
        activity.textContent = ""
    }, 3000)
})

socket.on('userList', ({ users }) => {
    showUsers(users)
})

socket.on('roomList', ({ rooms }) => {
    showRooms(rooms)
})

function showUsers(users) {
    usersList.textContent = ''
    if (users) {
        usersList.innerHTML = `<em>Users in ${roomInput.value}:</em>`
        users.forEach((user, i) => {
            usersList.textContent += ` ${user.name}`
            if (users.length > 1 && i !== users.length - 1) {
                usersList.textContent += ","
            }
        })
    }
}

function showRooms(rooms) {
    roomList.textContent = ''
    if (rooms) {
        roomList.innerHTML = '<em>Active Rooms:</em>'
        rooms.forEach((room, i) => {
            roomList.textContent += ` ${room}`
            if (rooms.length > 1 && i !== rooms.length - 1) {
                roomList.textContent += ","
            }
        })
    }
}

function embedContent(text) {
    const embeddedText = text.replace(/\b(https?:\/\/\S+\.(?:png|jpe?g|gif|mp4|ogg|wav))\b/gi, (match, url) => {
        if (/\.(mp4|ogg|wav)$/i.test(url)) {
            return `<video controls><source src="${url}" type="video/mp4"></video>`;
        } else if (/\.(png|jpe?g|gif)$/i.test(url)) {
            return `<img src="${url}" alt="Embedded Image">`;
        } else {
            return `<a href="${url}" target="_blank">${url}</a>`;
        }
    });

    return embeddedText;
}
