const onboardingHelper = require('../src/helpers/onboardingHelper');

module.exports = {
    data: {
        name: 'gwelcome',
        description: 'แสดงข้อความแนะนำตัวบอท ปุ่มเลือกภาษา และแนะนำสิทธิ์ Supporter (Welcome & Onboarding Card)'
    },
    run: async (client, interaction) => {
        const card = onboardingHelper.createWelcomeCard(client, interaction.guild);
        return interaction.reply(card);
    }
};
