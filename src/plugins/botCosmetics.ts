import { definePlugin } from "@utils/types";
import { Finder } from "@webpack";

const GITHUB_JSON_URL = "https://raw.githubusercontent.com/phaseworld-creator/my-cosmetics-bot/refs/heads/main/data.json";

let databaseCache: Record<string, any> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000;

async function getCosmeticsForUser(userId: string) {
    const now = Date.now();
    
    if (!databaseCache || (now - lastFetchTime) > CACHE_DURATION) {
        try {
            const response = await fetch(`${GITHUB_JSON_URL}?t=${now}`);
            if (response.ok) {
                databaseCache = await response.json();
                lastFetchTime = now;
            }
        } catch (e) {
            console.error("[CosmeticsPlugin] Error reading database from GitHub:", e);
        }
    }

    return databaseCache ? databaseCache[userId] : null;
}

export default definePlugin({
    name: "BotCosmetics",
    description: "Applies animated profiles using a GitHub hosted database updated by a bot.",
    authors: [{ name: "PhaseWorld", id: 0n }],

    async onStart() {
        const UserProfileMod = Finder.byProps("UserProfileBody", "default");
        
        Vencord.patcher.instead(UserProfileMod, "default", async (args, originalFunc) => {
            const [props] = args;
            const userId = props?.user?.id;

            if (userId) {
                const custom = await getCosmeticsForUser(userId);
                if (custom) {
                    if (custom.avatar) props.user.avatar = custom.avatar;
                    if (custom.banner) props.user.banner = custom.banner;
                    if (custom.decoration) props.user.avatarDecoration = { asset: custom.decoration };
                    if (custom.effect) props.profileEffectId = custom.effect;
                    if (custom.nameplate) props.customNameplate = custom.nameplate;
                }
            }
            return originalFunc(...args);
        });
    },

    onStop() {
        Vencord.patcher.unpatchAll();
        databaseCache = null;
    }
});
