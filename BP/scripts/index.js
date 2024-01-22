import { world, system, ItemStack } from "@minecraft/server";
import { DynamicDB } from "./database.js";
import config from "./config.js";
import { ChestFormData } from "./ChestUI/forms.js";
import { MessageFormData } from "@minecraft/server-ui";
import { forceShow } from "./Functions/forceShow.js";
import { expiredTime } from "./Functions/expiredTime.js";
import { toRomanNumber } from "./Functions/toRomanNumber.js";
import { formatNumber } from "./Functions/formatNumber.js";
import { getScore } from "./Functions/getScore.js";
console.warn("[Auction house] §l§aReloaded!")

/**
 * Copyright (C) 2024 WhiteeCattt
 * GitHub: https://github.com/WhiteeCattt/
 * Project: https://github.com/WhiteeCattt/Auction-house
*/
let entity;
const db = new DynamicDB("AuctionHouse", world)
const overworld = world.getDimension("overworld")
overworld.runCommandAsync(`scoreboard objectives add ${config.money_object} dummy`)
overworld.runCommandAsync(`tickingarea add circle 8 0 8 4 "AuctionHouseDatabase" true`)
const air = new ItemStack("air")


/**
 * Copyright (C) 2024 WhiteeCattt
 * GitHub: https://github.com/WhiteeCattt/
 * Project: https://github.com/WhiteeCattt/Auction-house
*/
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (!initialSpawn) return;
    if (!db.get(player.name)) {
        db.set(player.name, 0)
    }
    if (!overworld.getEntities({ type: "ah:database" }).length) {
        system.runTimeout(() => {
            db.set("AllAuctions", [])
            db.set("ID", 0)
            db.save()
            overworld.spawnEntity("ah:database", { x: 8, y: 0, z: 8 })
        }, 100)
    }
})


/**
 * Copyright (C) 2024 WhiteeCattt
 * GitHub: https://github.com/WhiteeCattt/
 * Project: https://github.com/WhiteeCattt/Auction-house
*/
system.runInterval(() => {
    [entity] = overworld.getEntities().filter(entity => entity.typeId === "ah:database")
    for (const player of world.getAllPlayers()) {
        player.runCommandAsync(`scoreboard players add @s ${config.money_object} ${db.get(player.name) ?? 0}`).then(() => {
            db.set(player.name, 0)
        })
    }
}, 10)



/**
 * Copyright (C) 2024 WhiteeCattt
 * GitHub: https://github.com/WhiteeCattt/
 * Project: https://github.com/WhiteeCattt/Auction-house
*/
world.beforeEvents.chatSend.subscribe((data) => {
    const { sender: player, message } = data
    if (message.toLowerCase().startsWith(`${config.cmd_prefix}ah`)) {
        const args = message.trim().split(/\s+/g)
        data.cancel = true
        if (!args[1]) return system.run(() => AuctionHouseUI(player));
        if (args[1] == "sell") {
            if (!args[2]) return player.sendMessage(config.prefix + `Use §g${config.cmd_prefix}ah sell <price>`);
            if (db.get("AllAuctions").length >= config.max_auctions) return player.sendMessage(config.prefix + `The auction is full!`)
            const myItems = db.get("AllAuctions").filter(item => item.seller == player.name)
            if (myItems.length >= config.max_player_auctions) return player.sendMessage(config.prefix + `You have the maximum number of items in the auction!`);
            const item = player.getComponent("inventory").container.getItem(player.selectedSlot)
            if (!item) return player.sendMessage(config.prefix + "Take the item in your hand!");
            if (isNaN(args[2]) || args[2] < 1) return player.sendMessage(config.prefix + "Wrong price!");
            if (args[2] > config.max_price) return player.sendMessage(config.prefix + `It is forbidden to auction items more expensive than §a$${formatNumber(config.max_price)}§r!`);
            if (config.banned_items.includes(item.typeId)) return player.sendMessage(config.prefix + "This item is not allowed to be auctioned!");
            try {
                player.sendMessage(config.prefix + `You have successfully placed an item §gx${item.amount}§r ${item.nameTag ?? `§g${item.typeId.replace("minecraft:", "").replaceAll("_", " ")}`}§r in an auction for §a$${formatNumber(args[2])}§r!`)
                player.runCommandAsync(`replaceitem entity @s slot.hotbar ${player.selectedSlot} air`).then(() => {
                    entity.getComponent("inventory").container.setItem(db.get("ID"), item)
                    db.get("AllAuctions").push({
                        seller: player.name,
                        price: Math.floor(args[2]),
                        createDate: Date.now(),
                        expired: Date.now() + config.expired,
                        type: item.typeId.replace("minecraft:", ""),
                        id: db.get("ID")
                    })
                    db.set("ID", db.get("ID") + 1)
                    db.save()
                })
            } catch (e) {
                console.warn(config.prefix + e)
                player.sendMessage(config.prefix + `There was an error when putting an item up for auction! Try write /reload.`)
            }
        } else if (args[1] == "help") {
            player.sendMessage("§2--- Auction house help ---")
            player.sendMessage(`${config.cmd_prefix}ah - open auction house`)
            player.sendMessage(`${config.cmd_prefix}ah help - auction house help`)
            player.sendMessage(`${config.cmd_prefix}ah sell <price> - put the item up for auction`)
            player.sendMessage(`${config.cmd_prefix}ah listings <nickname> - player item list`)
            player.sendMessage(`${config.cmd_prefix}ah expired - expired items`)
            player.sendMessage(`${config.cmd_prefix}ah search <item> - search item`)
            player.sendMessage(`${config.cmd_prefix}ah manage - manage auction`)
        } else if (args[1] == "listings") {
            system.run(() => {
                if (!args[2]) return listingUI(player, player.name);
                listingUI(player, args[2])
            })
        } else if (args[1] == "search") {
            system.run(() => {
                if (!args[2]) return player.sendMessage(config.prefix + `Use §g${config.cmd_prefix}ah search <item>`);
                searchUI(player, args[2])
            })
        } else if (args[1] == "manage") {
            if (!player.hasTag(config.admin_tag)) return player.sendMessage(config.prefix + "Not enough rights.");
            system.run(() => manageUI(player))
        } else if (args[1] == "expired") {
            system.run(() => expiredItemsUI(player))
        } else {
            player.sendMessage(config.prefix + `Unknown argument! Use §g${config.cmd_prefix}ah help`)
        }
    }
})



/**
 * Copyright (C) 2024 WhiteeCattt
 * GitHub: https://github.com/WhiteeCattt/
 * Project: https://github.com/WhiteeCattt/Auction-house
*/
async function AuctionHouseUI(player, page = 1) {
    const auctions = db.get("AllAuctions").filter(item => item.expired > Date.now()).sort((a, b) => b.createDate - a.createDate)
    const pages = Math.ceil((auctions.length || 1) / 45)
    const myItems = db.get("AllAuctions").filter(item => item.seller === player.name && item.expired > Date.now())
    const myExpiredItems = db.get("AllAuctions").filter(item => item.seller === player.name && item.expired < Date.now())
    const form = new ChestFormData("large")
    form.title(`All auctions [${page}/${pages}]`)
    form.button(49, "Auctions", [`Total items: §g${auctions.length}`, `§aClick to update`], "minecraft:ender_eye", 1)
    form.button(45, `Your auctions: §g${myItems.length}`, [`§aClick to go to`], "minecraft:diamond", 1)
    form.button(53, `Your expired items: §g${myExpiredItems.length}`, [`§aClick to go to`], "minecraft:coal", 1)
    if (page !== 1) {
        form.button(48, "Previous page", ["§aClick to go to"], "minecraft:arrow", 1)
    }
    if (page !== pages) {
        form.button(50, "Next page", ["§aClick to go to"], "minecraft:arrow", 1)
    }
    const start = (page - 1) * 45
    const end = start + 45
    const pagedItems = auctions.slice(start, end)
    for (let i = 0; i < 45; i++) {
        if (!pagedItems[i]) continue;
        const item = entity.getComponent("inventory").container.getItem(pagedItems[i].id)
        const data = pagedItems[i]
        let description = []
        let enchant = false
        const enchantments = Array.from(item.getComponent("enchantments").enchantments)
        if (enchantments.length > 0) {
            enchant = true
            enchantments.forEach(enchant => description.push(`§7${enchant.type.id} ${toRomanNumber(enchant.level)}`))
        }
        if (item.getComponent("durability")) {
            const durability = item.getComponent("durability")
            description.push(`§7Durability: ${durability.maxDurability - durability.damage}/${durability.maxDurability}`)
        }
        description.push("")
        description.push("§7------------------------")
        description.push(`§7Price: §a$${formatNumber(data.price)}`)
        description.push(`§7ID: §9${data.id}`)
        description.push(`§7Seller: §g${data.seller}`)
        description.push(`§7Expires in: §g${expiredTime(data.expired - Date.now())}`)
        description.push("§7------------------------")
        item.getLore().forEach(lore => description.push(lore))
        form.button(i, item.nameTag ?? item.typeId.replace("minecraft:", "").replaceAll("_", " "), description, item.typeId, item.amount, enchant)
    }
    const response = await forceShow(player, form)
    if (response.canceled) return;
    if (response.selection == 45) return listingUI(player, player.name);
    if (response.selection == 49) return AuctionHouseUI(player, page);
    if (response.selection == 48 && page !== 1) return AuctionHouseUI(player, page - 1);
    if (response.selection == 50 && page !== pages) return AuctionHouseUI(player, page + 1);
    if (response.selection == 53) return expiredItemsUI(player)
    try {
        const item = entity.getComponent("inventory").container.getItem(pagedItems[response.selection].id)
        const data = pagedItems[response.selection]
        const inventory = player.getComponent("inventory").container
        if (data.seller === player.name) {
            if (inventory.emptySlotsCount < 1) return player.sendMessage(config.prefix + "Your inventory is full!");
            if (!entity.getComponent("inventory").container.getItem(data.id)) return player.sendMessage(config.prefix + "Item not found!");
            inventory.addItem(item)
            player.sendMessage(config.prefix + `You have successfully withdrawn item §gx${item.amount}§r ${item.nameTag ?? `§g${item.typeId?.replace("minecraft:", "")?.replaceAll("_", " ")}`}§r from the auction!`)
            entity.getComponent("inventory").container.setItem(data.id, air)
            const index = db.get("AllAuctions").findIndex(item => item.id === data.id)
            if (index !== -1) {
                db.get("AllAuctions").splice(index, 1)
            }
            db.save()
            return;
        }
        if (data.expired < Date.now()) return player.sendMessage(config.prefix + "This one has run out of time!");
        if (getScore(player, config.money_object) < data.price) return player.sendMessage(config.prefix + "You don't have enough coins!");
        if (inventory.emptySlotsCount < 1) return player.sendMessage(config.prefix + "Your inventory is full!");
        if (await confirmUI(player, item, data) !== true) return;
        if (!entity.getComponent("inventory").container.getItem(data.id)) return player.sendMessage(config.prefix + "Item not found!");
        inventory.addItem(item)
        player.sendMessage(config.prefix + `You purchased the item §gx${item.amount}§r ${item.nameTag ?? `§g${item.typeId?.replace("minecraft:", "")?.replaceAll("_", " ")}`}§r for §a$${formatNumber(data.price)}§r!`)
        overworld.runCommandAsync(`tellraw "${data.seller}" {"rawtext":[{"text":"${config.prefix}Player §g${player.name}§r purchased item §gx${item.amount}§r ${item.nameTag ?? `§g${item.typeId?.replace("minecraft:", "")?.replaceAll("_", " ")}`}§r from you for §a$${formatNumber(data.price)}§r!"}]}`)
        overworld.runCommandAsync(`playsound random.fizz "${data.seller}"`)
        player.runCommandAsync(`scoreboard players remove @s ${config.money_object} ${data.price}`)
        db.set(data.seller, db.get(data.seller) + data.price)
        entity.getComponent("inventory").container.setItem(data.id, air)
        const index = db.get("AllAuctions").findIndex(item => item.id === data.id)
        if (index !== -1) {
            db.get("AllAuctions").splice(index, 1)
        }
        db.save()
        AuctionHouseUI(player)
    } catch (e) {
        console.warn(`§c${e}`)
        player.sendMessage(`§c${e}`)
    }
}



/**
 * Copyright (C) 2024 WhiteeCattt
 * GitHub: https://github.com/WhiteeCattt/
 * Project: https://github.com/WhiteeCattt/Auction-house
*/
async function listingUI(player, target, page = 1) {
    const auctions = db.get("AllAuctions").filter(item => item.seller === target && item.expired > Date.now()).sort((a, b) => b.createDate - a.createDate)
    const pages = Math.ceil((auctions.length || 1) / 45)
    const form = new ChestFormData("large")
    form.title(`${player.name == target ? "Your auctions" : `Player auctions ${target}`}§r [${page}/${pages}]`)
    form.button(49, `${player.name == target ? "Your auctions" : `Player auctions ${target}`}`, [`Total items: §g${auctions.length}`, `§aClick to update`], "minecraft:ender_eye", 1)
    if (page !== 1) {
        form.button(48, "Previous page", ["§aClick to go to"], "minecraft:arrow", 1)
    }
    if (page !== pages) {
        form.button(50, "Next page", ["§aClick to go to"], "minecraft:arrow", 1)
    }
    const start = (page - 1) * 45
    const end = start + 45
    const pagedItems = auctions.slice(start, end)
    for (let i = 0; i < 45; i++) {
        if (!pagedItems[i]) continue;
        const item = entity.getComponent("inventory").container.getItem(pagedItems[i].id)
        const data = pagedItems[i]
        let description = []
        let enchant = false
        const enchantments = Array.from(item.getComponent("enchantments").enchantments)
        if (enchantments.length > 0) {
            enchant = true
            enchantments.forEach(enchant => description.push(`§7${enchant.type.id} ${toRomanNumber(enchant.level)}`))
        }
        if (item.getComponent("durability")) {
            const durability = item.getComponent("durability")
            description.push(`§7Durability: ${durability.maxDurability - durability.damage}/${durability.maxDurability}`)
        }
        description.push("")
        description.push("§7------------------------")
        description.push(`§7Price: §a$${formatNumber(data.price)}`)
        description.push(`§7ID: §9${data.id}`)
        description.push(`§7Seller: §g${data.seller}`)
        description.push(`§7Expires in: §g${expiredTime(data.expired - Date.now())}`)
        description.push("§7------------------------")
        item.getLore().forEach(lore => description.push(lore))
        form.button(i, item.nameTag ?? item.typeId.replace("minecraft:", "").replaceAll("_", " "), description, item.typeId, item.amount, enchant)
    }
    const response = await forceShow(player, form)
    if (response.canceled) return;
    if (response.selection == 49) return listingUI(player, target, page);
    if (response.selection == 48 && page !== 1) return listingUI(player, target, page - 1);
    if (response.selection == 50 && page !== pages) return listingUI(player, target, page + 1);
    try {
        const item = entity.getComponent("inventory").container.getItem(pagedItems[response.selection].id)
        const data = pagedItems[response.selection]
        const inventory = player.getComponent("inventory").container
        if (data.seller === player.name) {
            if (inventory.emptySlotsCount < 1) return player.sendMessage(config.prefix + "Your inventory is full!");
            if (!entity.getComponent("inventory").container.getItem(data.id)) return player.sendMessage(config.prefix + "Item not found!");
            inventory.addItem(item)
            player.sendMessage(config.prefix + `You have successfully withdrawn item §gx${item.amount}§r ${item.nameTag ?? `§g${item.typeId?.replace("minecraft:", "")?.replaceAll("_", " ")}`}§r from the auction!`)
            entity.getComponent("inventory").container.setItem(data.id, air)
            const index = db.get("AllAuctions").findIndex(item => item.id === data.id)
            if (index !== -1) {
                db.get("AllAuctions").splice(index, 1)
            }
            db.save()
            return;
        }
        if (data.expired < Date.now()) return player.sendMessage(config.prefix + "This one has run out of time!");
        if (getScore(player, config.money_object) < data.price) return player.sendMessage(config.prefix + "You don't have enough coins!");
        if (inventory.emptySlotsCount < 1) return player.sendMessage(config.prefix + "Your inventory is full!");
        if (await confirmUI(player, item, data) !== true) return;
        if (!entity.getComponent("inventory").container.getItem(data.id)) return player.sendMessage(config.prefix + "Item not found!");
        inventory.addItem(item)
        player.sendMessage(config.prefix + `You purchased the item §gx${item.amount}§r ${item.nameTag ?? `§g${item.typeId?.replace("minecraft:", "")?.replaceAll("_", " ")}`}§r for §$ a${formatNumber(data.price)}§r!`)
        overworld.runCommandAsync(`tellraw "${data.seller}" {"rawtext":[{"text":"${config.prefix}Player §g${player.name}§r purchased item §gx${item.amount}§r ${item.nameTag ?? `§g${item.typeId?.replace("minecraft:", "")?.replaceAll("_", " ")}`}§r from you for §a$${formatNumber(data.price)}§r!"}]}`)
        overworld.runCommandAsync(`playsound random.fizz "${data.seller}"`)
        player.runCommandAsync(`scoreboard players remove @s ${config.money_object} ${data.price}`)
        db.set(data.seller, db.get(data.seller) + data.price)
        entity.getComponent("inventory").container.setItem(data.id, air)
        const index = db.get("AllAuctions").findIndex(item => item.id === data.id)
        if (index !== -1) {
            db.get("AllAuctions").splice(index, 1)
        }
        db.save()
    } catch (e) {
        console.warn(`§c${e}`)
        player.sendMessage(`§c${e}`)
    }
}



/**
 * Copyright (C) 2024 WhiteeCattt
 * GitHub: https://github.com/WhiteeCattt/
 * Project: https://github.com/WhiteeCattt/Auction-house
*/
async function searchUI(player, searchItem, page = 1) {
    const auctions = db.get("AllAuctions").filter(item => item.type.startsWith(searchItem.toLowerCase()) || item.type.endsWith(searchItem.toLowerCase()) && item.expired > Date.now()).sort((a, b) => b.data.createDate - a.data.createDate)
    const pages = Math.ceil((auctions.length || 1) / 45)
    const form = new ChestFormData("large")
    form.title(`Search ${searchItem}§r [${page}/${pages}]`)
    form.button(49, "Auctions", [`Total items: §g${auctions.length}`, `§aClick to update`], "minecraft:ender_eye", 1)
    if (page !== 1) {
        form.button(48, "Previous page", ["§aClick to go to"], "minecraft:arrow", 1)
    }
    if (page !== pages) {
        form.button(50, "Next page", ["§aClick to go to"], "minecraft:arrow", 1)
    }
    const start = (page - 1) * 45
    const end = start + 45
    const pagedItems = auctions.slice(start, end)
    for (let i = 0; i < 45; i++) {
        if (!pagedItems[i]) continue;
        const item = entity.getComponent("inventory").container.getItem(pagedItems[i].id)
        const data = pagedItems[i]
        let description = []
        let enchant = false
        const enchantments = Array.from(item.getComponent("enchantments").enchantments)
        if (enchantments.length > 0) {
            enchant = true
            enchantments.forEach(enchant => description.push(`§7${enchant.type.id} ${toRomanNumber(enchant.level)}`))
        }
        if (item.getComponent("durability")) {
            const durability = item.getComponent("durability")
            description.push(`§7Durability: ${durability.maxDurability - durability.damage}/${durability.maxDurability}`)
        }
        description.push("")
        description.push("§7------------------------")
        description.push(`§7Price: §a$${formatNumber(data.price)}`)
        description.push(`§7ID: §9${data.id}`)
        description.push(`§7Seller: §g${data.seller}`)
        description.push(`§7Expires in: §g${expiredTime(data.expired - Date.now())}`)
        description.push("§7------------------------")
        item.getLore().forEach(lore => description.push(lore))
        form.button(i, item.nameTag ?? item.typeId.replace("minecraft:", "").replaceAll("_", " "), description, item.typeId, item.amount, enchant)
    }
    const response = await forceShow(player, form)
    if (response.canceled) return;
    if (response.selection == 49) return AuctionHouseUI(player, page);
    if (response.selection == 48 && page !== 1) return AuctionHouseUI(player, page - 1);
    if (response.selection == 50 && page !== pages) return AuctionHouseUI(player, page + 1);
    try {
        const item = entity.getComponent("inventory").container.getItem(pagedItems[response.selection].id)
        const data = pagedItems[response.selection]
        if (data.seller === player.name) {
            if (inventory.emptySlotsCount < 1) return player.sendMessage(config.prefix + "Your inventory is full!");
            if (!entity.getComponent("inventory").container.getItem(data.id)) return player.sendMessage(config.prefix + "Item not found!");
            inventory.addItem(item)
            player.sendMessage(config.prefix + `You have successfully withdrawn item §gx${item.amount}§r ${item.nameTag ?? `§g${item.typeId?.replace("minecraft:", "")?.replaceAll("_", " ")}`}§r from the auction!`)
            entity.getComponent("inventory").container.setItem(data.id, air)
            const index = db.get("AllAuctions").findIndex(item => item.id === data.id)
            if (index !== -1) {
                db.get("AllAuctions").splice(index, 1)
            }
            db.save()
            return;
        }
        if (data.expired < Date.now()) return player.sendMessage(config.prefix + "This one has run out of time!");
        if (getScore(player, config.money_object) < data.price) return player.sendMessage(config.prefix + "You don't have enough coins!");
        if (inventory.emptySlotsCount < 1) return player.sendMessage(config.prefix + "Your inventory is full!");
        if (await confirmUI(player, item, data) !== true) return;
        if (!entity.getComponent("inventory").container.getItem(data.id)) return player.sendMessage(config.prefix + "Item not found!");
        inventory.addItem(item)
        player.sendMessage(config.prefix + `You purchased the item §gx${item.amount}§r ${item.nameTag ?? `§g${item.typeId?.replace("minecraft:", "")?.replaceAll("_", " ")}`}§r for §a$${formatNumber(data.price)}§r!`)
        overworld.runCommandAsync(`tellraw "${data.seller}" {"rawtext":[{"text":"${config.prefix}Player §g${player.name}§r purchased item §gx${item.amount}§r ${item.nameTag ?? `§g${item.typeId?.replace("minecraft:", "")?.replaceAll("_", " ")}`}§r from you for §a$${formatNumber(data.price)}§r!"}]}`)
        overworld.runCommandAsync(`playsound random.fizz "${data.seller}"`)
        player.runCommandAsync(`scoreboard players remove @s ${config.money_object} ${data.price}`)
        db.set(data.seller, db.get(data.seller) + data.price)
        entity.getComponent("inventory").container.setItem(data.id, air)
        const index = db.get("AllAuctions").findIndex(item => item.id === data.id)
        if (index !== -1) {
            db.get("AllAuctions").splice(index, 1)
        }
        db.save()
    } catch (e) {
        console.warn(`§c${e}`)
        player.sendMessage(`§c${e}`)
    }
}



/**
 * Copyright (C) 2024 WhiteeCattt
 * GitHub: https://github.com/WhiteeCattt/
 * Project: https://github.com/WhiteeCattt/Auction-house
*/
async function manageUI(player, page = 1) {
    const auctions = db.get("AllAuctions").sort((a, b) => b.createDate - a.createDate)
    const pages = Math.ceil((auctions.length || 1) / 45)
    const myItems = db.get("AllAuctions").filter(a => a.seller == player.name)
    const form = new ChestFormData("large")
    form.title(`Manage auctions [${page}/${pages}]`)
    form.button(49, "Auctions", [`Total items: §g${auctions.length}`, `§aClick to update`], "minecraft:ender_eye", 1)
    if (page !== 1) {
        form.button(48, "Previous page", ["§aClick to go to"], "minecraft:arrow", 1)
    }
    if (page !== pages) {
        form.button(50, "Next page", ["§aClick to go to"], "minecraft:arrow", 1)
    }
    const start = (page - 1) * 45
    const end = start + 45
    const pagedItems = auctions.slice(start, end)
    for (let i = 0; i < 45; i++) {
        if (!pagedItems[i]) continue;
        const item = entity.getComponent("inventory").container.getItem(pagedItems[i].id)
        const data = pagedItems[i]
        let description = []
        let enchant = false
        const enchantments = Array.from(item.getComponent("enchantments").enchantments)
        if (enchantments.length > 0) {
            enchant = true
            enchantments.forEach(enchant => description.push(`§7${enchant.type.id} ${toRomanNumber(enchant.level)}`))
        }
        if (item.getComponent("durability")) {
            const durability = item.getComponent("durability")
            description.push(`§7Durability: ${durability.maxDurability - durability.damage}/${durability.maxDurability}`)
        }
        description.push("")
        description.push("§7------------------------")
        description.push(`§7Price: §a$${formatNumber(data.price)}`)
        description.push(`§7ID: §9${data.id}`)
        description.push(`§7Seller: §g${data.seller}`)
        if (expiredTime(data.expired - Date.now()).length > 0) {
            description.push(`§7Expires in: §g${expiredTime(data.expired - Date.now())}`)
        }
        description.push("§7------------------------")
        item.getLore().forEach(lore => description.push(lore))
        description.push("")
        description.push(`§cClick to take item`)
        form.button(i, item.nameTag ?? item.typeId.replace("minecraft:", "").replaceAll("_", " "), description, item.typeId, item.amount, enchant)
    }
    const response = await forceShow(player, form)
    if (response.canceled) return;
    if (response.selection == 49) return AuctionHouseUI(player, page);
    if (response.selection == 48 && page !== 1) return AuctionHouseUI(player, page - 1);
    if (response.selection == 50 && page !== pages) return AuctionHouseUI(player, page + 1);
    try {
        const item = entity.getComponent("inventory").container.getItem(pagedItems[response.selection].id)
        const data = pagedItems[response.selection]
        const inventory = player.getComponent("inventory").container
        if (inventory.emptySlotsCount < 1) return player.sendMessage(config.prefix + "Your inventory is full!");
        if (!entity.getComponent("inventory").container.getItem(data.id)) return player.sendMessage(config.prefix + "Item not found!");
        inventory.addItem(item)
        player.sendMessage(config.prefix + `You have successfully withdrawn item §gx${item.amount}§r ${item.nameTag ?? `§g${item.typeId?.replace("minecraft:", "")?.replaceAll("_", " ")}`}§r from the auction!`)
        entity.getComponent("inventory").container.setItem(data.id, air)
        const index = db.get("AllAuctions").findIndex(item => item.id === data.id)
        if (index !== -1) {
            db.get("AllAuctions").splice(index, 1)
        }
        db.save()
    } catch (e) {
        console.warn(`§c${e}`)
        player.sendMessage(`§c${e}`)
    }
}



/**
 * Copyright (C) 2024 WhiteeCattt
 * GitHub: https://github.com/WhiteeCattt/
 * Project: https://github.com/WhiteeCattt/Auction-house
*/
async function expiredItemsUI(player, target, page = 1) {
    const auctions = db.get("AllAuctions").filter(item => item.seller === player.name && item.expired < Date.now())
    const pages = Math.ceil((auctions.length || 1) / 45)
    const form = new ChestFormData("large")
    form.title(`Expires items [${page}/${pages}]`)
    form.button(49, `Your expired auctions`, [`Total items: §g${auctions.length}`, `§aClick to update`], "minecraft:ender_eye", 1)
    if (page !== 1) {
        form.button(48, "Previous page", ["§aClick to go to"], "minecraft:arrow", 1)
    }
    if (page !== pages) {
        form.button(50, "Next page", ["§aClick to go to"], "minecraft:arrow", 1)
    }
    const start = (page - 1) * 45
    const end = start + 45
    const pagedItems = auctions.slice(start, end)
    for (let i = 0; i < 45; i++) {
        if (!pagedItems[i]) continue;
        const item = entity.getComponent("inventory").container.getItem(pagedItems[i].id)
        const data = pagedItems[i]
        let description = []
        let enchant = false
        const enchantments = Array.from(item.getComponent("enchantments").enchantments)
        if (enchantments.length > 0) {
            enchant = true
            enchantments.forEach(enchant => description.push(`§7${enchant.type.id} ${toRomanNumber(enchant.level)}`))
        }
        if (item.getComponent("durability")) {
            const durability = item.getComponent("durability")
            description.push(`§7Durability: ${durability.maxDurability - durability.damage}/${durability.maxDurability}`)
        }
        description.push("")
        description.push("§7------------------------")
        description.push(`§7Price: §a$${formatNumber(data.price)}`)
        description.push(`§7ID: §9${data.id}`)
        description.push(`§7Seller: §g${data.seller}`)
        description.push("§7------------------------")
        item.getLore().forEach(lore => description.push(lore))
        form.button(i, item.nameTag ?? item.typeId.replace("minecraft:", "").replaceAll("_", " "), description, item.typeId, item.amount, enchant)
    }
    const response = await forceShow(player, form)
    if (response.canceled) return;
    if (response.selection == 49) return expiredItemsUI(player, page);
    if (response.selection == 48 && page !== 1) return expiredItemsUI(player, page - 1);
    if (response.selection == 50 && page !== pages) return expiredItemsUI(player, page + 1);
    try {
        const item = entity.getComponent("inventory").container.getItem(pagedItems[response.selection].id)
        const data = pagedItems[response.selection]
        const inventory = player.getComponent("inventory").container
        if (inventory.emptySlotsCount < 1) return player.sendMessage(config.prefix + "Your inventory is full!");
        if (!entity.getComponent("inventory").container.getItem(data.id)) return player.sendMessage(config.prefix + "Item not found!");
        inventory.addItem(item)
        player.sendMessage(config.prefix + `You have successfully withdrawn item §gx${item.amount}§r ${item.nameTag ?? `§g${item.typeId?.replace("minecraft:", "")?.replaceAll("_", " ")}`}§r from the auction!`)
        entity.getComponent("inventory").container.setItem(data.id, air)
        const index = db.get("AllAuctions").findIndex(item => item.id === data.id)
        if (index !== -1) {
            db.get("AllAuctions").splice(index, 1)
        }
        db.save()
    } catch (e) {
        console.warn(`§c${e}`)
        player.sendMessage(`§c${e}`)
    }
}



/**
 * Copyright (C) 2024 WhiteeCattt
 * GitHub: https://github.com/WhiteeCattt/
 * Project: https://github.com/WhiteeCattt/Auction-house
*/
async function confirmUI(player, item, data) {
    const corfim_buttons = [0, 1, 2, 3, 4, 9, 10, 11, 12, 18, 19, 20, 21]
    const cancel_buttons = [5, 6, 7, 8, 14, 15, 16, 17, 22, 23, 24, 25, 26]
    const form = new ChestFormData("small")
    form.title("§l§aConfirm")
    for (const button of corfim_buttons) {
        form.button(button, "§aConfirm", ["§aClick to buy item"], "minecraft:green_dye", 1)
    }
    for (const button of cancel_buttons) {
        form.button(button, "§cCancel", ["§cClick to cancel"], "minecraft:red_dye", 1)
    }
    let description = []
    let enchant = false
    const enchantments = Array.from(item.getComponent("enchantments").enchantments)
    if (enchantments.length > 0) {
        enchant = true
        enchantments.forEach(enchant => description.push(`§7${enchant.type.id} ${toRomanNumber(enchant.level)}`))
    }
    if (item.getComponent("durability")) {
        const durability = item.getComponent("durability")
        description.push(`§7Durability: ${durability.maxDurability - durability.damage}/${durability.maxDurability}`)
    }
    description.push("")
    description.push(`§7Price: §a$${formatNumber(data.price)}`)
    description.push(`§7ID: §9${data.id}`)
    description.push(`§7Seller: §g${data.seller}`)
    if (expiredTime(data.expired - Date.now()).length > 0) {
        description.push(`§7Expires in: §g${expiredTime(data.expired - Date.now())}`)
    }
    item.getLore().forEach(lore => description.push(lore))
    form.button(13, item.nameTag ?? item.typeId.replace("minecraft:", "").replaceAll("_", " "), description, item.typeId, item.amount, enchant)
    const response = await forceShow(player, form)
    if (corfim_buttons.includes(response.selection)) return true;
    if (cancel_buttons.includes(response.selection)) return false;
}
