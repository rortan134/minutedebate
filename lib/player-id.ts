import { nanoid } from "nanoid";

const PLAYER_ID_KEY = "minutedebate_player_id";

export function getOrCreatePlayerId(): string {
    if (typeof window === "undefined") {
        return nanoid();
    }

    const stored = localStorage.getItem(PLAYER_ID_KEY);
    if (stored) {
        return stored;
    }

    const newId = nanoid();
    localStorage.setItem(PLAYER_ID_KEY, newId);
    return newId;
}
