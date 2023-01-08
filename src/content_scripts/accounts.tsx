import {AccountStore} from "firefly-iii-typescript-sdk-fetch/dist/models";

function scrapeAccountsFromPage(): AccountStore[] {
    // TODO: This is where you implement the scraper to pull the individual
    //  accounts from the page
    return [];
}

window.addEventListener("load",function(event) {
    const button = document.createElement("button");
    button.textContent = "Export accounts to Firefly III"
    button.addEventListener("click", () => {
        const accounts = scrapeAccountsFromPage();
        chrome.runtime.sendMessage(
            {
                action: "store_accounts",
                value: accounts,
            },
            () => {}
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
    housing.style.marginBlock = "-37px";
    housing.append(button)

    setTimeout(() => {
        document.querySelector('ul.actions')!.append(housing);
    }, 2000); // TODO: A smarter way of handling render delay
});
