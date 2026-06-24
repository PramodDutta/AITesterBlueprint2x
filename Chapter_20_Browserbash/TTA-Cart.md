# TTACart end-to-end checkout

- Open the TTACart login page - ttaCart - https://app.thetestingacademy.com/playwright/ttacart
- Log in as standard_user with the password tta_secret
- Go to the products inventory page
- Add the "Test.allTheThings() T-Shirt (Red)" to the cart
- Open the cart and verify it contains exactly 1 item
- Click Checkout
- Fill the checkout details: first name Pramod,
  last name Dutta, postal code 560001
- Continue to the order overview, then click Finish
- Verify the page shows "Thank you for your order!"