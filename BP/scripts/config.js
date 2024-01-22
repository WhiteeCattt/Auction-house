export default {
    prefix: "§7[§l§bAuction house§r§7] §r", // Prefix
    cmd_prefix: "-", // Command prefix
    admin_tag: "Admin", // Admin tag
    max_player_auctions: 3, // Maximum number of auctions for a player
    max_auctions: 10000, // Maximum number of auctions
    expires: 604800000, // Expiration time (In milliseconds). Infinity = never
    max_price: 100000000, // Maximum price
    money_object: "money", // Scorboard money object
    banned_items: [ // Banned items
        "minecraft:bedrock",
        "minecraft:deny"
    ]
}
