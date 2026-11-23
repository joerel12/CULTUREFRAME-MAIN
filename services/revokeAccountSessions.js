export const revokeAccountSessions = async (sequelize, userId, transaction) => {
  const [table] = await sequelize.query(
    "SELECT to_regclass('session_records') AS table_name",
    { type: sequelize.QueryTypes.SELECT, transaction }
  );
  if (!table?.table_name) return;
  await sequelize.query(
    "DELETE FROM session_records WHERE data::jsonb ->> 'userId' = :userId",
    { replacements: { userId: String(userId) }, transaction }
  );
};
