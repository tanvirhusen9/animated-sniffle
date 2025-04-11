const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

const admins = ['8801789879427']; // Replace with your WhatsApp number
const dataFile = 'data.json';

function loadData() {
    if (fs.existsSync(dataFile)) {
        const raw = fs.readFileSync(dataFile);
        return JSON.parse(raw);
    } else {
        return { fund: 0, team: [], donations: [], lastAdded: '' };
    }
}

function saveData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function isAdmin(sender) {
    return admins.includes(sender.split('@')[0]);
}

let data = loadData();

async function startBot() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const words = text.trim().split(' ');
        const command = words[0].toLowerCase();

        const reply = async (text) => {
            await sock.sendMessage(sender, { text });
        };

        if (command === '#amount') {
            reply(`Total fund: ৳${data.fund}`);
        } else if (command === '#team') {
            if (data.team.length === 0) reply('No team members added yet.');
            else reply(`Team Members:
${data.team.join('\n')}`);
        } else if (command === '#add') {
            if (!isAdmin(msg.key.participant || sender)) return;
            const name = words.slice(1).join(' ');
            if (name) {
                data.team.push(name);
                data.lastAdded = name;
                saveData(data);
                reply(`${name} has been added to the team.`);
            }
        } else if (command === '#remove') {
            if (!isAdmin(msg.key.participant || sender)) return;
            const name = words.slice(1).join(' ');
            const index = data.team.indexOf(name);
            if (index > -1) {
                data.team.splice(index, 1);
                saveData(data);
                reply(`${name} has been removed from the team.`);
            } else reply(`${name} not found.`);
        } else if (command === '#fund') {
            const amount = parseInt(words[1]);
            if (!isNaN(amount)) {
                const donor = msg.pushName || 'Anonymous';
                data.fund += amount;
                data.donations.push({ name: donor, amount });
                saveData(data);
                reply(`৳${amount} added. Total fund: ৳${data.fund}`);
            }
        } else if (command === '#updatefund') {
            if (!isAdmin(msg.key.participant || sender)) return;
            const name = words[1];
            const amount = parseInt(words[2]);
            if (name && !isNaN(amount)) {
                data.fund += amount;
                data.donations.push({ name, amount });
                saveData(data);
                reply(`${name} added ৳${amount}. Total fund: ৳${data.fund}`);
            }
        } else if (command === '#fundlist') {
            if (data.donations.length === 0) reply('No donations yet.');
            else {
                const list = data.donations.map(d => `${d.name}: ৳${d.amount}`).join('\n');
                reply(`Donation List:
${list}`);
            }
        } else if (command === '#donors') {
            const donors = [...new Set(data.donations.map(d => d.name))];
            reply(`Donors:
${donors.join('\n')}`);
        } else if (command === '#lastadded') {
            if (data.lastAdded) reply(`Last added member: ${data.lastAdded}`);
            else reply('No member added yet.');
        } else if (command === '#resetfund') {
            if (!isAdmin(msg.key.participant || sender)) return;
            data.fund = 0;
            data.donations = [];
            saveData(data);
            reply('Fund has been reset.');
        } else if (command === '#help') {
            reply(`*Command List:*
#amount - Show total fund
#team - Show team members
#add [name] - Add a member (admin only)
#remove [name] - Remove a member (admin only)
#fund [amount] - Add fund from current sender
#updatefund [name] [amount] - Add fund for someone (admin only)
#fundlist - Show all donations
#donors - List unique donors
#lastadded - Show last added member
#resetfund - Reset fund (admin only)
#help - Show this list`);
        }
    });
}

startBot();
