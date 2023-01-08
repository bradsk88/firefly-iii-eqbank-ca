import {
    AccountRoleProperty,
    AccountStore,
    ShortAccountTypeProperty
} from "firefly-iii-typescript-sdk-fetch/dist/models";

const knownAccountsWithoutNumbers: {[key: string]: string} = {
    'TFSA GICs': 'all_tfsa_gics',
    'TFSA Savings Account': 'tfsa_savings',
}

function scrapeAccountsFromPage(): AccountStore[] {
    expandAll();
    return Array.from(document.querySelectorAll('li.account.accordion-item').values()).map(
        row => {
            let infoSection = row.querySelector('.account__details');
            let accountNumber = infoSection!.id?.replace('-account', '')?.trim();
            let nameSection = infoSection!.querySelector('span.account__details-name');
            let accountName = nameSection?.textContent?.trim();
            if  (!accountName) {
                accountName = infoSection!.textContent!;
            }
            let name = accountName.trim();
            if (!accountNumber) {
                accountNumber = knownAccountsWithoutNumbers[name];
            }
            return {
                name: `${name} (EQ Bank)`,
                type: ShortAccountTypeProperty.Asset,
                accountNumber: accountNumber,
                accountRole: AccountRoleProperty.SavingAsset, // TODO: Infer this from the page headers
            };
        }
    )
}

function expandAll(): void {
    document.querySelectorAll('button.accordion-item[aria-expanded=false]').forEach(
        e => (e as HTMLButtonElement).click()
    )
}

window.addEventListener("load", function (event) {
    const button = document.createElement("button");
    button.textContent = "Export accounts to Firefly III"
    button.addEventListener("click", () => {
        const accounts = scrapeAccountsFromPage();
        chrome.runtime.sendMessage(
            {
                action: "store_accounts",
                value: accounts,
            },
            () => {
            }
        );
    }, false);

    button.style.background = 'rgb(255, 205, 41)';
    button.style.border = 'none';
    button.style.padding = '8px';
    button.style.borderRadius = '4px';
    button.style.fontWeight = '600';
    button.style.width = '253px';

    const housing = document.createElement("div")
    housing.style.textAlign = "end";
    housing.style.width = "100%";
    // housing.style.marginBlock = "-37px";
    housing.append(button)

    setTimeout(() => {
        document.querySelector('ul.actions')!.append(housing);
    }, 2000); // TODO: A smarter way of handling render delay
});
