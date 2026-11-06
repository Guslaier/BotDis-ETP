const { EmbedBuilder } = require('discord.js');
const settingsManager = require('../src/helpers/settingsManager');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'glang',
        description: 'เปลี่ยนภาษาการสื่อสารของบอท GOOLIX (Change bot language: Thai / English)',
        options: [
            {
                name: 'language',
                type: 3, // STRING
                description: 'เลือกภาษา / Choose language',
                required: true,
                choices: [
                    { name: '🇹🇭 ภาษาไทย (Thai)', value: 'th' },
                    { name: '🇬🇧 English (EN)', value: 'en' }
                ]
            }
        ]
    },
    run: async (client, interaction) => {
        const guildId = interaction.guild.id;
        const lang = interaction.options.getString('language') || 'th';

        settingsManager.setGuildLanguage(guildId, lang);

        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle(lang === 'en' ? '🌐 Language Configuration' : '🌐 ตั้งค่าภาษาของเซิร์ฟเวอร์')
            .setDescription(i18n.t(guildId, 'LANG_CHANGED'))
            .setFooter({ text: 'GOOLIX Cosmic Slime Music Engine 🎧🟢' });

        return interaction.reply({ embeds: [embed] });
    }
};
