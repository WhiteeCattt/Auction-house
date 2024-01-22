export function expiredTime(duration) {
    if (duration === Infinity) return "never";
    const millisecondsPerSecond = 1000;
    const millisecondsPerMinute = 60 * millisecondsPerSecond;
    const millisecondsPerHour = 60 * millisecondsPerMinute;
    const millisecondsPerDay = 24 * millisecondsPerHour;
    const millisecondsPerWeek = 7 * millisecondsPerDay;
    const millisecondsPerYear = 365 * millisecondsPerDay;
    const years = Math.floor(duration / millisecondsPerYear);
    duration %= millisecondsPerYear;
    const weeks = Math.floor(duration / millisecondsPerWeek);
    duration %= millisecondsPerWeek;
    const days = Math.floor(duration / millisecondsPerDay);
    duration %= millisecondsPerDay;
    const hours = Math.floor(duration / millisecondsPerHour);
    duration %= millisecondsPerHour;
    const minutes = Math.floor(duration / millisecondsPerMinute);
    duration %= millisecondsPerMinute;
    const seconds = Math.floor(duration / millisecondsPerSecond);
    let durationString = "";
    if (years > 0) {
        durationString += `${years}y `;
    }
    if (weeks > 0) {
        durationString += `${weeks}w `;
    }
    if (days > 0) {
        durationString += `${days}d `;
    }
    if (hours > 0) {
        durationString += `${hours}h `;
    }
    if (minutes > 0) {
        durationString += `${minutes}m `;
    }
    if (seconds > 0) {
        durationString += `${seconds}s `;
    }
    return durationString.trim();
}
