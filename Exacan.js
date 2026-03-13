"use strict";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const http2 = require("http2");
const tls = require("tls");
const WS = require("ws");
const dns = require("dns");

try { require("os").setPriority(0, -20); } catch {}

const TOKEN = "MTQ3NDMxNTEyMTg3NzU4MjAxNw.Ghu_04.dJ891Y1y-r7tzmE1J05k0U_X8-oLNYdTwVBqGo";
const PASSWORD = "exakral47";
const GUILD_ID = "1480664880259273118";
let IPS = ["162.159.136.232","162.159.137.232","162.159.128.233","162.159.135.232","162.159.138.232","162.159.133.232","162.159.129.233","162.159.130.233"];
const HOST = "discord.com";
const API = "10";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML,like Gecko) Chrome/138.0.0.0 Safari/537.36";
const SP = "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6InRyIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEzOC4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTM4LjAuMC4wIiwib3NfdmVyc2lvbiI6IjEwIiwicmVmZXJyZXIiOiIiLCJyZWZlcnJpbmdfZG9tYWluIjoiIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjI2MDAwMCwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=";
const GATEWAYS = ["wss://gateway.discord.gg","wss://gateway-us-east1-b.discord.gg","wss://gateway-us-east1-c.discord.gg","wss://gateway-us-east1-d.discord.gg"];
const NOOP = () => {};
const H2 = 3;
const pool = new Array(H2).fill(null);
const hotSocks = new Array(H2).fill(null);
const tlsSessions = new Map();
const guilds = new Map();
const guildChanges = new Map();
const claimSeen = new Map();
const B_GU = Buffer.from('"GUILD_UPDATE"');
const B_GD = Buffer.from('"GUILD_DELETE"');
const B_READY = Buffer.from('"READY"');
const B_OP10 = Buffer.from('"op":10');
const B_OP11 = Buffer.from('"op":11');
const B_OP7 = Buffer.from('"op":7');
const log = m => process.stdout.write(m + "\n");
const MFA_HDRS = { "accept": "*/*", "accept-language": "tr", "content-type": "application/json", "origin": "https://discord.com", "referer": "https://discord.com/channels/@me", "sec-ch-ua": '"Not)A;Brand";v="8","Chromium";v="138"', "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": '"Windows"', "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-origin", "user-agent": UA, "x-discord-locale": "tr", "x-discord-timezone": "Europe/Istanbul", "x-super-properties": SP };

let mfa = "", mfaNext = 0, mfaBusy = false, mfaH2 = null;

function isDupe(code) {
    const now = Date.now(), last = claimSeen.get(code);
    if (last && now - last < 800) return true;
    claimSeen.set(code, now); return false;
}
function trackChange(gid) {
    const arr = guildChanges.get(gid) || [];
    arr.push(Date.now());
    if (arr.length > 10) arr.shift();
    guildChanges.set(gid, arr);
}
function predictNext(gid) {
    const arr = guildChanges.get(gid);
    if (!arr || arr.length < 2) return 0;
    let s = 0;
    for (let i = 1; i < arr.length; i++) s += arr[i] - arr[i-1];
    return arr[arr.length-1] + (s / (arr.length-1));
}
function gcMaps() {
    const now = Date.now();
    for (const [k,v] of claimSeen) if (now - v > 5000) claimSeen.delete(k);
    for (const [k] of guildChanges) if (!guilds.has(k)) guildChanges.delete(k);
}
function makeSock(i) {
    const key = "s" + i;
    const x = tls.connect({ host: IPS[i % IPS.length], port: 443, servername: HOST, ALPNProtocols: ["h2"], rejectUnauthorized: false, session: tlsSessions.get(key), highWaterMark: 131072, ciphers: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256", ecdhCurve: "X25519:prime256v1" });
    x.setNoDelay(true); x.setKeepAlive(true, 1000);
    x.on("session", ss => tlsSessions.set(key, ss));
    x.on("error", NOOP);
    x.on("close", () => { hotSocks[i] = makeSock(i); });
    try { x.setSendBufferSize(524288); x.setRecvBufferSize(524288); } catch {}
    return x;
}
function makeH2(i) {
    const s = http2.connect("https://" + HOST, {
        settings: { enablePush: false, initialWindowSize: 16777215, maxConcurrentStreams: 256 },
        createConnection: () => hotSocks[i] && !hotSocks[i].destroyed ? hotSocks[i] : makeSock(i)
    });
    s.on("error", NOOP);
    s._k = setInterval(() => { try { if (!s.destroyed) s.ping(NOOP); } catch {} }, 4000);
    s.on("goaway", () => { clearInterval(s._k); if (pool[i] === s) pool[i] = makeH2(i); });
    s.on("close", () => { clearInterval(s._k); if (pool[i] === s) setTimeout(() => { pool[i] = makeH2(i); }, 100); });
    return s;
}
async function getMfaH2() {
    if (mfaH2 && !mfaH2.destroyed && !mfaH2.closed) return mfaH2;
    return new Promise((res, rej) => {
        const s = http2.connect("https://" + HOST, { rejectUnauthorized: false, createConnection: () => { const x = tls.connect({ host: IPS[0], port: 443, servername: HOST, ALPNProtocols: ["h2"], rejectUnauthorized: false }); x.setNoDelay(true); x.setKeepAlive(true, 5000); return x; } });
        const t = setTimeout(() => { s.destroy(); rej(new Error("timeout")); }, 8000);
        s.once("connect", () => { clearTimeout(t); mfaH2 = s; s.on("error", NOOP); s.on("goaway", () => { if (mfaH2 === s) mfaH2 = null; }); s.on("close", () => { if (mfaH2 === s) mfaH2 = null; }); res(s); });
        s.once("error", e => { clearTimeout(t); rej(e); });
    });
}
async function mfaReq(path, method, body) {
    const ss = await getMfaH2();
    if (ss.destroyed || ss.closed) { mfaH2 = null; return mfaReq(path, method, body); }
    return new Promise((res, rej) => {
        const req = ss.request({ ":method": method, ":path": path, ":authority": HOST, "authorization": TOKEN, ...MFA_HDRS });
        req.setTimeout(10000, () => { req.destroy(); rej(new Error("timeout")); });
        const ch = []; let st = 0;
        req.on("response", h => { st = h[":status"] | 0; });
        req.on("data", c => ch.push(c));
        req.on("end", () => { let j = {}; try { j = JSON.parse(Buffer.concat(ch).toString()); } catch {} j._st = st; res(j); });
        req.on("error", rej);
        body ? req.end(body) : req.end();
    });
}
async function refreshMfa() {
    if (!PASSWORD || mfaBusy || Date.now() < mfaNext) return;
    mfaBusy = true;
    try {
        const t = await mfaReq("/api/v" + API + "/guilds/" + GUILD_ID + "/vanity-url", "PATCH", '{"code":""}');
        if (t._st === 429) { mfaNext = Date.now() + ((t.retry_after || 5) * 1000 + 200); return; }
        const ticket = t && t.mfa && t.mfa.ticket;
        if (!ticket) throw new Error(t.message || "no ticket");
        const f = await mfaReq("/api/v" + API + "/mfa/finish", "POST", JSON.stringify({ ticket, mfa_type: "password", data: PASSWORD }));
        if (f._st === 429) { mfaNext = Date.now() + ((f.retry_after || 5) * 1000 + 200); return; }
        if (!f.token) throw new Error(f.message || "no token");
        mfa = f.token; log("MFA OK"); mfaNext = Date.now() + 280000;
    } catch(e) { log("MFA ERR: " + e.message); mfaNext = Date.now() + 15000; }
    finally { mfaBusy = false; }
}

function warmPool() {
    for (let i = 0; i < H2; i++) {
        const s = pool[i];
        if (!s || s.destroyed) { pool[i] = makeH2(i); continue; }
        try {
            const r = s.request({ ":method": "GET", ":path": "/api/v" + API + "/users/@me", ":authority": HOST, "authorization": TOKEN, "user-agent": UA });
            r.on("error", NOOP); r.resume(); r.end();
        } catch {}
    }
}

function fireClaim(code) {
    const body = '{"code":"' + code + '"}';
    const len = String(Buffer.byteLength(body));
    for (let i = 0; i < H2; i++) {
        const s = pool[i];
        if (!s || s.destroyed) { pool[i] = makeH2(i); continue; }
        try {
            const r = s.request({ ":method": "PATCH", ":path": "/api/v" + API + "/guilds/" + GUILD_ID + "/vanity-url", ":authority": HOST, ":scheme": "https", "authorization": TOKEN, "content-type": "application/json", "content-length": len, "user-agent": UA, "x-super-properties": SP, "x-discord-mfa-authorization": mfa });
            const ch = [];
            r.on("response", h => { r._st = h[":status"] | 0; });
            r.on("data", c => ch.push(c));
            r.on("end", () => {
                const st = r._st || 0;
                let msg = "";
                try { const j = JSON.parse(Buffer.concat(ch).toString()); msg = j.message || j.code || ""; } catch {}
                log("[" + i + "] " + st + " discord.gg/" + code + (msg ? " | " + msg : ""));
            });
            r.on("error", NOOP); r.end(body);
        } catch {}
    }
}
function fire(code, gid) {
    if (isDupe(code)) return;
    if (!mfa) { log("no mfa (" + code + ")"); return; }
    const now = Date.now(), next = predictNext(gid);
    if (next > 0 && next - now > 30000) { setTimeout(() => fireClaim(code), Math.max(0, next - now - 50)); return; }
    fireClaim(code);
}
function gw(url) {
    const ws = new WS(url, { perMessageDeflate: false, skipUTF8Validation: true, maxPayload: 0 });
    let hb = null, seq = null, sid = null, rurl = null, ack = true, retry = 1000;
    const hbp = () => seq !== null ? '{"op":1,"d":' + seq + '}' : '{"op":1,"d":null}';
    const ident = '{"op":2,"d":{"token":"' + TOKEN + '","intents":1,"properties":{"os":"linux","browser":"chrome","device":""}}}';

    function scheduleHb(iv) {
        if (hb) clearInterval(hb);
        let tick = 0;
        hb = setInterval(() => {
            if (!ack) { ws.close(4000); return; }
            ack = false;
            if (ws.readyState === 1) ws.send(hbp());
            if (++tick % 5 === 0) {
                clearInterval(hb);
                setTimeout(() => scheduleHb(iv), Math.max(1, (Math.random() * 400) | 0));
            }
        }, (iv * 0.9) | 0);
    }

    ws.on("open", () => { retry = 1000; });
    ws.on("message", raw => {
        const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        if (buf.indexOf(B_OP11) !== -1) { ack = true; return; }
        const hasGU = buf.indexOf(B_GU) !== -1, hasGD = buf.indexOf(B_GD) !== -1;
        if (hasGU || hasGD) {
            const p = JSON.parse(buf.toString());
            if (p.s != null) seq = p.s;
            if (hasGU) { const prev = guilds.get(p.d.id), nv = p.d.vanity_url_code || null; if (prev && prev !== nv) { trackChange(p.d.id); if (nv) guilds.set(p.d.id, nv); else guilds.delete(p.d.id); fire(prev, p.d.id); } else if (!prev && nv) guilds.set(p.d.id, nv); }
            if (hasGD) { const prev = guilds.get(p.d.id); if (prev) { guilds.delete(p.d.id); fire(prev, p.d.id); } }
            return;
        }
        if (buf.indexOf(B_READY) !== -1) {
            const p = JSON.parse(buf.toString());
            if (p.s != null) seq = p.s; sid = p.d.session_id; rurl = p.d.resume_gateway_url;
            for (const g of p.d.guilds || []) if (g.vanity_url_code) guilds.set(g.id, g.vanity_url_code);
            log("Ready " + guilds.size + " vanities"); return;
        }
        if (buf.indexOf(B_OP10) !== -1) {
            const p = JSON.parse(buf.toString());
            ack = true;
            setTimeout(() => { ack = false; if (ws.readyState === 1) ws.send(hbp()); }, (Math.random() * 200) | 0);
            scheduleHb(p.d.heartbeat_interval);
            ws.send(sid ? '{"op":6,"d":{"token":"' + TOKEN + '","session_id":"' + sid + '","seq":' + (seq ?? "null") + '}}' : ident);
            return;
        }
        if (buf.indexOf(B_OP7) !== -1) ws.close(4000);
    });
    ws.on("close", code => {
        if (hb) { clearInterval(hb); hb = null; }
        const can = !!sid && seq !== null && code !== 4007;
        if (code === 4007) { sid = null; seq = null; rurl = null; }
        const d = retry; retry = Math.min((retry * 1.5) | 0, 20000);
        setTimeout(() => gw(can && rurl ? rurl + "/?v=" + API + "&encoding=json" : url), d);
    });
    ws.on("error", NOOP);

    const wsPing = setInterval(() => {
        if (ws.readyState === 1) ws.ping(NOOP);
    }, 2000);
    const wsRenew = setTimeout(() => { try { ws.close(4000); } catch {} }, 15 * 60 * 1000 + (Math.random() * 30000 | 0));
    ws.on("close", () => { clearInterval(wsPing); clearTimeout(wsRenew); });
}

const dnsUp = () => dns.resolve4(HOST, (e, a) => { if (!e && a.length) IPS = [...new Set([...a, ...IPS])].slice(0, 8); });
dnsUp(); setInterval(dnsUp, 300000);
setInterval(gcMaps, 60000);
setInterval(warmPool, 2000);

function scheduleMinute28() {
    const now = new Date(), next = new Date(now);
    next.setMinutes(28, 0, 0);
    if (now.getMinutes() >= 28) next.setHours(next.getHours() + 1);
    setTimeout(() => {
        refreshMfa();
        for (let i = 0; i < H2; i++) { hotSocks[i] = makeSock(i); const old = pool[i]; pool[i] = makeH2(i); setTimeout(() => { try { if (old && !old.destroyed) old.close(); } catch {} }, 500); }
        scheduleMinute28();
    }, next - now);
}

for (let i = 0; i < H2; i++) { hotSocks[i] = makeSock(i); pool[i] = makeH2(i); }
if (PASSWORD) { refreshMfa(); setInterval(refreshMfa, 1000); }
scheduleMinute28();
GATEWAYS.forEach((u, i) => setTimeout(() => gw(u + "/?v=" + API + "&encoding=json"), i * 1500));
process.on("uncaughtException", NOOP);
process.on("unhandledRejection", NOOP);
