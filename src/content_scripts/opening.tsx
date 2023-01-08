import {AccountStore} from "firefly-iii-typescript-sdk-fetch/dist/models";
import {OpeningBalance} from "../background";
import {TransactionTypeProperty} from "firefly-iii-typescript-sdk-fetch";
import {monthIndexes} from "../common/dates";
import {PageAccount} from "../common/accounts";
import {priceFromString} from "../common/prices";

export function scrapeOpeningBalanceFromPage(
    account: PageAccount,
): OpeningBalance {
    const table = document.querySelector("table.eq-table");
    const row = table!.querySelector('tbody tr:last-child');
    const cols = row!.getElementsByTagName('td');
    const [date, month, year] = cols.item(0)!.textContent!.split(' ');
    const [amountIn, amountOut] = [cols.item(2)!.textContent, cols.item(3)!.textContent]
    const balance = priceFromString(cols.item(4)!.textContent!);

    const amt = priceFromString((amountIn || amountOut)!);

    const openingBalance = balance - (amt || 0);
    return {
        accountNumber: account.id,
        accountName: account.name,
        balance: openingBalance,
        date: new Date(
            Number.parseInt(year),
            monthIndexes[month.toLowerCase()],
            Number.parseInt(date) - 1,
            23, 59, 59, 999,
        ),
    };
}