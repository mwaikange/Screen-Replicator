# Issues to Come Back To

These TypeScript issues existed before the PaySME Request-to-Pay work:

- `mobile/src/screens/CaseDetailScreen.tsx:161` - `styles.errorText` is referenced but not defined.
- `mobile/src/screens/GroupChatScreen.tsx:423` - compares a member role with `"owner"`, although the declared roles are `"creator" | "admin" | "member"`.
- `mobile/src/screens/GroupChatScreen.tsx:426` - same invalid `"owner"` comparison.
- `mobile/src/screens/GroupsScreen.tsx:72` - accesses `alreadyReported` on a response union where that property is not always present.
- `mobile/src/screens/IncidentDetailsScreen.tsx:593` - `navigation` is not defined.
- `mobile/src/screens/IncidentDetailsScreen.tsx:602` - `navigation` is not defined.

## Related Projects

- Mobile app: `C:\vs_ngumu\Screen-Replicator\mobile`
- Web app: `C:\web_ngumu\Ngumus_Eye_2026`
- Admin portal: `C:\web_ngumu\Ngumu Admin Portal\v0-ngumu-admin-portal-main`
- Admin portal repository: `https://github.com/mwaikange/v0-ngumu-admin-portal`
