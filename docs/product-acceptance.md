# Verify a Windows package on the target system

[Deutsch](produktabnahme.md)

These checks extend the runnable example to an application with an installer and persistent storage. Define an observable outcome for each required workflow. In the test report, record the package version, the system it ran on, the cases you actually exercised, and any prerequisites you still need.

## From tested sources to a package

1. **Identify the tested source files.** Record file paths and SHA-256 hashes before and after running the tests and syntax checks. Check the test results for failed, skipped, and cancelled cases. Build the package from a copy of the exact sources you tested. If a source file changes during the run, you can no longer attribute the result to that source snapshot.
2. **Verify the tools and dependencies.** Record the runtime version, its source, and its expected hash. Check the launcher you actually use against its build record and the installer compiler against its expected hash. Install the pinned dependency versions into a fresh directory. Compare the installed package tree with the intended set, including optional platform-specific components. Deliver the applicable license texts, notices, and any required source materials in the intended distribution format.
3. **Verify the package contents.** Record the relative path, size, and SHA-256 hash of each payload file. Reopen the finished archive and compare the full set of files and their contents with the manifest. Check for unexpected files, paths redirected through directory links, and names that collide when compared without regard to case. Check the installed files as well. Keep user data, backups, and credentials outside the payload.

## Installation and version changes

Use a dedicated test identity to install the package in a fresh directory with a separate profile. Start the installed application through its intended entry point. Verify that it becomes ready, that you can complete the main workflow, and that it shuts down cleanly along with any child processes it started.

Test an update with an existing data set. Identify the active version after a successful update, after an interrupted update, and after a supported rollback. In each case, launch that version and open the data set. Verify how the installer handles a changed launcher and whether data survives uninstallation and reinstallation as the product promises.

## User workflow, permissions, and restart

Use synthetic records with expected values set in advance. Create a record through the normal user interface, change it, and perform the supported correction or reversal. After each step, check the affected values, including any derived results. Restart the application under the same test profile and reopen the record. Verify the saved final state and, where the workflow requires it, the change history.

If the application has roles or access levels, attempt the same operation with a restricted account. Check direct access and indirect outputs such as search results, totals, and saved reports. Revoke a permission from an account that initially had it. Check the effect both in the open session and after signing in again, applying the product's stated session policy. Restore the permission and verify access to the same saved result.

Compare the package contents before and after the session. Do the same for a separate test data set that remained untouched during the run. Check generated logs and reports for the synthetic secrets used in the test. Record the finding without disclosing their values. Keep separate evidence for the package build, the installation, and the successful user workflow.
