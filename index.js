import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/*
    TO-DO:
    dont let user re-enter the same room
    don't let users have spaces in their names (for commands)
    more commands...
    room creator has admin priviledges, can /op other people, and random will be chosen once admin disconnects, not a random will be chosen if admin already gave someone else /op
    people with admin can kick, mute, ban, and timeout other people, only not other admins.
    people with admin can send admin messages with /plain [text]
    users being able to ping and whisper to eachother with @NAME and /whisper [name] [message]
    active room join button
*/

const PORT = process.env.PORT || 3500
const ADMIN = "this string is longer then 20 characters so i don't think any user can pick this one";

const app = express()

app.use(express.static(path.join(__dirname, "public")))

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})

// state 
const UsersState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray
    }
}

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://192.168.2.66:3500"]
    }
})

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`)

    // Upon connection - only to user 
    socket.emit('message', buildMessage(ADMIN, "Welcome to Pisscord!"))

    socket.on('enterRoom', ({ name, room }) => {

        // leave previous room 
        const previousRoom = getUser(socket.id)?.room

        if (previousRoom) {
            socket.leave(previousRoom)
            io.to(previousRoom).emit('message', buildMessage(ADMIN, `${name} has left the room`))
        }

        const user = activateUser(socket.id, name, room)

        // Cannot update previous room users list until after the state update in activate user 
        if (previousRoom) {
            io.to(previousRoom).emit('userList', {
                users: getUsersInRoom(previousRoom)
            })
        }

        // join room 
        socket.join(user.room)

        // To user who joined 
        socket.emit('message', buildMessage(ADMIN, `You have joined ${user.room}`))

        // To everyone else 
        socket.broadcast.to(user.room).emit('message', buildMessage(ADMIN, `${user.name} has joined the room`))

        // Update user list for room 
        io.to(user.room).emit('userList', {
            users: getUsersInRoom(user.room)
        })

        // Update rooms list for everyone 
        io.emit('roomList', {
            rooms: getAllActiveRooms()
        })
    })

    // When user disconnects - to all others 
    socket.on('disconnect', () => {
        const user = getUser(socket.id)
        userLeavesApp(socket.id)

        if (user) {
            io.to(user.room).emit('message', buildMessage(ADMIN, `${user.name} has left the room`))

            io.to(user.room).emit('userList', {
                users: getUsersInRoom(user.room)
            })

            io.emit('roomList', {
                rooms: getAllActiveRooms()
            })
        }

        console.log(`User ${socket.id} disconnected`)
    })

    // Listening for a message event 
    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room
        if (room) {
            if (text.startsWith('/')) {
                handleSlashCommand(text);
                return;
            }

            io.to(room).emit('message', buildMessage(name, text))
        }
    })

    // Listen for activity 
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room
        if (room) {
            socket.broadcast.to(room).emit('activity', name)
        }
    })

    function handleSlashCommand(input) {
        const command = input.substring(1);
        const user = getUser(socket.id);

        const [commandName, ...params] = command.split(' ');

        // Execute commands based on commandName
        switch (commandName.toLowerCase()) {
            case 'help':
                const helpMessage = "Available commands:<br>" +
                    "/help - Display this help message<br>" +
                    `/hug [name] - says: <i>${user.name} hugs [name]</i>`;
                socket.emit('message', buildMessage(ADMIN, helpMessage))
                break;
            case 'hug':
                io.to(user.room).emit('message', buildMessage(ADMIN, `<i>${user.name} hugs ${params[0]}</i>`))
                break;
            default:
                socket.emit('message', buildMessage(ADMIN, "Unknown command, type /help for all commands"))
        }
    }
})

function buildMessage(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}

// User functions 
function activateUser(id, name, room) {
    const user = { id, name, room }
    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !== id),
        user
    ])
    return user
}

function userLeavesApp(id) {
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id)
    )
}

function getUser(id) {
    return UsersState.users.find(user => user.id === id)
}

function getUsersInRoom(room) {
    return UsersState.users.filter(user => user.room === room)
}

function getAllActiveRooms() {
    return Array.from(new Set(UsersState.users.map(user => user.room)))
}