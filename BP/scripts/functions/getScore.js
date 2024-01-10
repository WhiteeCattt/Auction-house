import { world } from "@minecraft/server";

export function getScore(target, objective) {
  try {
    const oB = world.scoreboard.getObjective(objective);
    if (typeof target == "string")
      return oB.getScore(
        oB.getParticipants().find((pT) => pT.displayName == target)
      );
    return oB.getScore(target.scoreboardIdentity);
  } catch {
    return 0;
  }
}
