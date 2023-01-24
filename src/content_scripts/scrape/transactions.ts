import {AccountRead} from "firefly-iii-typescript-sdk-fetch/dist/models/AccountRead";
import {monthIndexes, parseDate} from "../../common/dates";
import {priceFromString} from "../../common/prices";

export function getButtonDestination(): Element {
    return document.querySelector('app-more-options-menu')!;
}

/**
 * @param accounts The first page of account in your Firefly III instance
 */
export async function getCurrentPageAccount(
    accounts: AccountRead[],
): Promise<AccountRead> {
    const accountNumberSpan = document.querySelector("span.account-details__id");
    const accountNumber = accountNumberSpan!.textContent!.replaceAll('-', '',);
    return accounts.find(
        acct => acct.attributes.accountNumber === accountNumber,
    )!;
}

export function getRowElements(): Element[] {
    const table = document.querySelector("table.eq-table");
    return Array.from(table!.querySelectorAll('tbody tr').values())
}

export function getRowDate(el: Element): Date {
    const cols = el.getElementsByTagName('td');
    const [date, month, year] = cols.item(0)!.textContent!.split(' ');
    return new Date(
        Number.parseInt(year.trim()),
        monthIndexes[month.toLowerCase()],
        Number.parseInt(date),
    );
}

function isRowLoading(r: Element): boolean {
    return false;
}

export function getRowAmount(r: Element): number {
    if (isRowLoading(r)) {
        throw new Error("Page is not ready for scraping")
    }
    const cols = r.getElementsByTagName('td');
    const [amountIn, amountOut] = [cols.item(2)!.textContent, cols.item(3)!.textContent]
    if (amountIn) {
        return priceFromString(amountIn)
    }
    return priceFromString(amountOut!)
}

export function getRowDesc(r: Element): string {
    const cols = r.getElementsByTagName('td');
    return cols.item(1)!.textContent!.trim();
}
