import {TransactionStore, TransactionTypeProperty} from "firefly-iii-typescript-sdk-fetch";
import {AccountRead} from "firefly-iii-typescript-sdk-fetch/dist/models/AccountRead";
import {addButtonOnURLMatch} from "../common/buttons";
import {monthIndexes} from "../common/dates";
import {priceFromString} from "../common/prices";
import {scrapeOpeningBalanceFromPage} from "./opening";
import {PageAccount} from "../common/accounts";

/**
 * @param accounts The first page of account in your Firefly III instance
 */
async function getCurrentPageAccount(
    accounts: AccountRead[],
): Promise<PageAccount> {
    const accountNumberSpan = document.querySelector("span.account-details__id");
    const accountNumber = accountNumberSpan!.textContent!.replaceAll('-', '', );
    let acct = accounts.find(
        acct => acct.attributes.accountNumber === accountNumber,
    )!;
    return {
        id: acct.id,
        name: acct.attributes.name,
    };
}

/**
 * @param pageAccountId The Firefly III account ID for the current page
 */
function scrapeTransactionsFromPage(
    pageAccountId: string,
): TransactionStore[] {
    const table = document.querySelector("table.eq-table");
    const rows = Array.from(table!.querySelectorAll('tbody tr').values())
    return rows.map(
        row => {
            const cols = row.getElementsByTagName('td');
            const [date, month, year] = cols.item(0)!.textContent!.split(' ');
            const [amountIn, amountOut] = [cols.item(2)!.textContent, cols.item(3)!.textContent]
            const tType = amountIn ? TransactionTypeProperty.Deposit : TransactionTypeProperty.Withdrawal;
            const description = cols.item(1)!.textContent!.trim();
            const sourceId = tType === TransactionTypeProperty.Withdrawal ? pageAccountId : undefined;
            const destId = tType === TransactionTypeProperty.Deposit ? pageAccountId : undefined;

            return {
                transactions: [{
                    type: tType,
                    date: new Date(
                        Number.parseInt(year.trim()),
                        monthIndexes[month.toLowerCase()],
                        Number.parseInt(date),
                    ),
                    amount: `${Math.abs(priceFromString((amountIn || amountOut)!))}`,
                    description: description,
                    sourceId: sourceId,
                    destinationId: destId,
                }]
            };
        }
    )
}

const buttonId = 'firefly-iii-export-transactions-button';

function addButton() {
    const target = document.querySelector('app-more-options-menu');
    if (!target) {
        return;
    }

    const button = document.createElement("button");
    button.textContent = "Export to Firefly III"
    button.addEventListener("click", async () => {
        const accounts = await chrome.runtime.sendMessage({
            action: "list_accounts",
        });
        const id = await getCurrentPageAccount(accounts);
        const transactions = scrapeTransactionsFromPage(id.id);
        chrome.runtime.sendMessage(
            {
                action: "store_transactions",
                value: transactions,
            },
            () => {
            }
        );
        const openingBalance = scrapeOpeningBalanceFromPage(id)
        chrome.runtime.sendMessage(
            {
                action: "store_opening",
                value: openingBalance,
            },
            () => {
            }
        );
    }, false);

    button.classList.add('more-menu__main-btn', 'custom-button', 'secondary');
    target.prepend(button)
}

// If your manifest.json allows your content script to run on multiple pages,
// you can call this function more than once, or set the urlPath to "".
addButtonOnURLMatch(
    'accounts/main/details',
    () => !!document.getElementById(buttonId),
    () => addButton(),
)
