import session from "express-session";
import { SessionRecord } from "../models/SessionRecord.js";

export class DatabaseSessionStore extends session.Store {
  get(sid, callback) {
    SessionRecord.findByPk(sid).then(async record => {
      if (!record) return callback(null, null);
      if (record.expiresAt <= new Date()) {
        await record.destroy();
        return callback(null, null);
      }
      callback(null, JSON.parse(record.data));
    }).catch(callback);
  }

  set(sid, value, callback = () => {}) {
    const expiresAt = value.cookie?.expires ? new Date(value.cookie.expires) : new Date(Date.now() + 8 * 60 * 60 * 1000);
    SessionRecord.upsert({ sid, data: JSON.stringify(value), expiresAt })
      .then(() => callback(null)).catch(callback);
  }

  touch(sid, value, callback = () => {}) {
    const expiresAt = value.cookie?.expires ? new Date(value.cookie.expires) : new Date(Date.now() + 8 * 60 * 60 * 1000);
    SessionRecord.update({ expiresAt }, { where: { sid } })
      .then(() => callback(null)).catch(callback);
  }

  destroy(sid, callback = () => {}) {
    SessionRecord.destroy({ where: { sid } }).then(() => callback(null)).catch(callback);
  }
}
