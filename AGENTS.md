# MINNA

MINNA is a Node.js/Express IoT platform (Layui frontend, MongoDB + Redis) for managing ESP32 "xiaozhi" voice assistant devices, with plugins for AI chat (Coze / Qianfan / Tongyi), TTS, and ASR. The upstream README targets Windows; the notes below cover running it on Linux.

## Cursor Cloud specific instructions

### Services and how they run
- **Web app (MINNA)**: Express server on `http://127.0.0.1:6700`. Start with `npm start` (runs `node ./bin/www`) from the repo root. There is no separate build or dev/watch command — it is plain `node`, so restart the process to pick up code changes. Config comes from `.env` (already committed) and the plugin `.env` files under `plugins/*/`.
  - On startup the app also opens plugin WebSocket/audio servers: ASR backend `8081`, ASR frontend `8082`, TTS `8083`. These are for ESP32 devices; the web UI works without any device connected.
  - On first run against an empty DB it auto-creates the admin user (**admin / admin**) and seeds the TTS voice list.
- **MongoDB** (required): `mongod` on `127.0.0.1:27017`, run with `--auth`. The app connects as `mongodb://minna:minna1314@localhost:27017/minna?authSource=admin` (see `common/db.js`). The `minna` root user already exists in the data dir at `/var/lib/mongodb`.
- **Redis** (required): on `127.0.0.1:6379`, no password (see `common/redisclient.js`). Used for login access tokens / session cache.

Starting the datastores is NOT part of the update script (they are stateful services). Start them once per session before `npm start`:
```
sudo -u mongodb mongod --dbpath /var/lib/mongodb --bind_ip 127.0.0.1 --port 27017 --logpath /var/log/mongodb/mongod.log --auth --fork
sudo service redis-server start
```

### Node version gotcha (important)
- The project targets **Node 20.18.1** (installed via nvm). The VM PATH has `/exec-daemon/node` (Node 22) *ahead* of nvm, so a bare `node` resolves to v22. Always run the app with the nvm Node on PATH:
```
export PATH="$HOME/.nvm/versions/node/v20.18.1/bin:$PATH"
```

### Native dependency gotcha (@discordjs/opus)
- `package.json` pins `@discordjs/opus` to `github:discordjs/opus`, which fails to compile on a fresh clone (its `deps/opus` submodule sources are not fetched, so `make` errors). The plugins `require('@discordjs/opus')` at load time, so the app will not start without a working build.
- Workaround used by the update script: install everything with `--ignore-scripts`, then overlay the npm-published prebuilt with `npm install --no-save @discordjs/opus@0.9.0`. Do NOT run a bare `npm install` afterwards, or npm will try to rebuild the github version and break the module again.

### Lint / test / build
- There is no linter, no test suite, and no build step configured (the only npm script is `start`). "Verifying" means starting the datastores + `npm start` and hitting the app (e.g. `curl "http://127.0.0.1:6700/users/login?username=admin&password=admin"` should return `{"code":0,...}`).
