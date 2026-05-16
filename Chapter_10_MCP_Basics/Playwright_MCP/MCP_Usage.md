 Playwright script (tests/vwo-login.spec.ts):           
                                                                           
  import { test, expect } from '@playwright/test';
                                                                             
  test('VWO login - invalid credentials show error', async ({ page }) => {
    await page.goto('https://app.vwo.com');                                  
                                                                             
    await expect(page).toHaveURL(/.*\/#\/login/);                            
    await expect(page).toHaveTitle('Login - VWO');                           
                                                                             
    await page.getByRole('textbox', { name: 'Email address'                  
  }).fill('wronguser@test.com');                                           
    await page.getByRole('textbox', { name: 'Password'                       
  }).fill('WrongPass123!');                              
                                                                           
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
   
    const errorMessage = page.getByText(                                     
      'Your email, password, IP address or location did not match'
    );                                                                       
    await expect(errorMessage).toBeVisible();
                                                                             
    await page.screenshot({ path: 'vwo-login-error.png' });                  
  });                                                                      
                                                                             
  Run:                                                   
                                                                           
  npx playwright test tests/vwo-login.spec.ts --headed

  Steps executed via MCP:                                                    
   
  1. browser_navigate → https://app.vwo.com (redirects /#/login)             
  2. browser_snapshot → locate email/password/submit refs
  3. browser_type → email wronguser@test.com                                 
  4. browser_type → password WrongPass123!                                   
  5. browser_click → Sign in button                                        
  6. browser_wait_for → 2s                                                   
  7. browser_snapshot → captured error text              
  8. browser_take_screenshot → vwo-login-error.png                           
  9. browser_close
                     