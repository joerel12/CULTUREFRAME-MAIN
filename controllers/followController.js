import { Follow, sequelize } from "../models/Follow.js";
import { User } from "../models/userModel.js";
import { Moment } from "../models/Moment.js";
import { Op } from "sequelize";

const followController = {

  // POST /follow/:userId  — follow a user
  follow: async (req, res) => {
    try {
      await Follow.sync();
      const followerId  = req.session.userId;
      const followingId = parseInt(req.params.userId);

      if (!followerId) return res.status(401).json({ success: false, message: "Not logged in" });
      if (followerId === followingId) return res.status(400).json({ success: false, message: "You cannot follow yourself" });

      await Follow.findOrCreate({ where: { follower_id: followerId, following_id: followingId } });

      const count = await Follow.count({ where: { following_id: followingId } });
      return res.json({ success: true, action: "followed", followers: count });
    } catch (err) {
      console.error("follow error:", err);
      return res.status(500).json({ success: false, message: "Failed to follow" });
    }
  },

  // DELETE /follow/:userId  — unfollow a user
  unfollow: async (req, res) => {
    try {
      await Follow.sync();
      const followerId  = req.session.userId;
      const followingId = parseInt(req.params.userId);

      if (!followerId) return res.status(401).json({ success: false, message: "Not logged in" });

      await Follow.destroy({ where: { follower_id: followerId, following_id: followingId } });

      const count = await Follow.count({ where: { following_id: followingId } });
      return res.json({ success: true, action: "unfollowed", followers: count });
    } catch (err) {
      console.error("unfollow error:", err);
      return res.status(500).json({ success: false, message: "Failed to unfollow" });
    }
  },

  // GET /community  — moments feed from followed users + all public moments
  community: async (req, res) => {
    try {
      await Follow.sync();
      const userId = req.session.userId;

      // Get all moments with user info, newest first
      const moments = await Moment.findAll({
        order: [["createdAt", "DESC"]],
        limit: 50
      });

      // Get user info for each moment
      const enriched = await Promise.all(moments.map(async (m) => {
        const user = await User.findByPk(m.user_id, {
          attributes: ["id", "name", "profileImage"]
        });

        let isFollowing = false;
        let isOwn = false;

        if (userId) {
          isOwn = m.user_id === parseInt(userId);
          if (!isOwn) {
            const follow = await Follow.findOne({
              where: { follower_id: userId, following_id: m.user_id }
            });
            isFollowing = !!follow;
          }
        }

        return {
          id:          m.id,
          filename:    m.filename,
          url:         m.filename ? "/uploads/" + m.filename : null,
          caption:     m.caption,
          createdAt:   m.createdAt,
          user_id:     m.user_id,
          userName:    user ? user.name : "Unknown",
          userAvatar:  user && user.profileImage ? "/uploads/" + user.profileImage : null,
          isFollowing,
          isOwn
        };
      }));

      res.render("customer/community", {
        title:   "Community — CultureFrame",
        moments: enriched,
        isLoggedIn: !!userId
      });
    } catch (err) {
      console.error("community feed error:", err);
      res.status(500).send("Error loading community feed");
    }
  },

  // GET /community/user/:userId  — view a user's public profile + moments
  userProfile: async (req, res) => {
    try {
      await Follow.sync();
      const viewerId    = req.session.userId;
      const profileId   = parseInt(req.params.userId);

      const profileUser = await User.findByPk(profileId, {
        attributes: ["id", "name", "profileImage", "createdAt"]
      });
      if (!profileUser) return res.status(404).send("User not found");

      const moments = await Moment.findAll({
        where: { user_id: profileId },
        order: [["createdAt", "DESC"]]
      });

      const followersCount  = await Follow.count({ where: { following_id: profileId } });
      const followingCount  = await Follow.count({ where: { follower_id: profileId } });

      let isFollowing = false;
      let isOwn       = false;

      if (viewerId) {
        isOwn = parseInt(viewerId) === profileId;
        if (!isOwn) {
          const f = await Follow.findOne({ where: { follower_id: viewerId, following_id: profileId } });
          isFollowing = !!f;
        }
      }

      res.render("customer/user-profile", {
        title:          `${profileUser.name} — CultureFrame`,
        profileUser:    { id: profileUser.id, name: profileUser.name, profileImage: profileUser.profileImage, createdAt: profileUser.createdAt },
        moments:        moments.map(m => ({ id: m.id, url: m.filename ? "/uploads/" + m.filename : null, caption: m.caption, createdAt: m.createdAt })),
        followersCount,
        followingCount,
        isFollowing,
        isOwn,
        isLoggedIn:     !!viewerId
      });
    } catch (err) {
      console.error("userProfile error:", err);
      res.status(500).send("Error loading profile");
    }
  }
};

export { followController };
