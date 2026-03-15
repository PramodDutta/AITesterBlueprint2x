# Bug Report: Login Error Message

## Title
Confusing Error Message on Failed Login with Invalid Credentials

---

## Environment
| Field | Value |
|-------|-------|
| Application URL | app.vw.com |
| Browser | Chrome |
| Browser Version | [NEEDS CLARIFICATION] |
| Operating System | macOS 15.3 |
| Network | Direct Connection (No VPN) |
| Test Environment | [NEEDS CLARIFICATION - Production/Staging/Dev] |

---

## Severity
[NEEDS CLARIFICATION] — Select one:
- [ ] Low
- [ ] Medium
- [ ] High
- [ ] Critical

---

## Steps to Reproduce
1. Navigate to app.vw.com
2. Enter an invalid username
3. Enter an invalid password
4. Click the submit button

---

## Expected Result
[NEEDS CLARIFICATION] — The system should display a clear message indicating:
- [ ] "Invalid username and/or password"
- [ ] Account not found
- [ ] Incorrect credentials
- [ ] Other: _______________

---

## Actual Result
Error message displayed: **"You are not allowed to log in."**

This error message is ambiguous and does not clearly communicate the reason for the login failure with invalid credentials.

---

## Issue Description
When submitting the login form with invalid credentials, the error message "You are not allowed to log in." appears. This message is unclear and could imply various scenarios:
- Account restrictions/locked
- Permissions denied
- Invalid credentials (which should be the actual reason)

The current message does not help the user understand why their login failed.

---

## Evidence Required
- [ ] Screenshot of error message
- [ ] Chrome console logs (F12 > Console tab)
- [ ] Network tab logs from failed login request
- [ ] Reproduction on different Chrome version

---

## Additional Observations
- Remember me checkbox is visible on the login page
- Social login options are available on the login page
- [NEEDS CLARIFICATION] — Does this error appear for ALL invalid login attempts?
- [NEEDS CLARIFICATION] — Is this the expected behavior or a software defect?

---

## Questions for Clarification
1. What is the exact Chrome version you're using?
2. What should the error message say for invalid credentials?
3. Is this a confirmed bug or expected behavior?
4. What is the test environment (Production/Staging/Dev)?
5. Can you provide screenshots and console logs?

---

**Report Created:** 15 March 2026
**Status:** [OPEN - Pending Clarifications]
