const { MessageFlags } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
 data: {
 name: 'gcleancard',
 description: 'Clean up lingering or duplicate music cards in this channel',
 },
 run: async (client, interaction, kazagumo) => {
 const guildId = interaction.guild?.id;
 await interaction.deferReply({ flags: MessageFlags.Ephemeral });
 const channel = interaction.channel;
 if (!channel || !channel.messages) {
 return interaction.followUp({
 content: i18n.t(guildId, 'CLEANCARD_NO_ACCESS'),
 flags: MessageFlags.Ephemeral
 });
 }

 const player = kazagumo.players.get(guildId);
 const activeCardId = player?.nowPlayingMessage?.id;

 try {
 const fetched = await channel.messages.fetch({ limit: 50 });
 const deadCards = fetched.filter(msg => {
 if (msg.author.id !== client.user.id) return false;
 if (activeCardId && msg.id === activeCardId) return false;

 const hasMusicButtons = msg.components?.some(comp => {
 if (comp.customId?.startsWith('music_')) return true;
 if (comp.components?.some(c => c.customId?.startsWith('music_'))) return true;
 if (comp.components?.some(c => c.components?.some(btn => btn.customId?.startsWith('music_')))) return true;
 return false;
 });
 const hasMusicEmbed = msg.embeds?.some(e =>
 e.author?.name?.includes('Now Playing') || e.title?.includes('Now Playing')
 );
 return hasMusicButtons || hasMusicEmbed;
 });

 if (deadCards.size === 0) {
 return interaction.followUp({
 content: i18n.t(guildId, 'CLEANCARD_NONE'),
 flags: MessageFlags.Ephemeral
 });
 }

 let deletedCount = 0;
 for (const msg of deadCards.values()) {
 try {
 await msg.delete();
 deletedCount++;
 } catch {
 try {
 await msg.edit({ components: [] });
 deletedCount++;
 } catch {}
 }
 }

 return interaction.followUp({
 content: i18n.t(guildId, 'CLEANCARD_SUCCESS', { count: deletedCount }),
 flags: MessageFlags.Ephemeral
 });
 } catch (err) {
 return interaction.followUp({
 content: ` Error: ${err.message}`,
 flags: MessageFlags.Ephemeral
 });
 }
 }
};

