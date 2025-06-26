export function insertWithoutDuplicate<T>(array: T[], item: T): boolean {
    if (!array.includes(item)) {
        array.push(item);
        return true;
    }
    return false;
}

export function remove<T>(array: T[], item: T): T[] {
    return array.filter(i => i !== item);
}

export default function stringify(data: any): string {
    return JSON.stringify(data)
}