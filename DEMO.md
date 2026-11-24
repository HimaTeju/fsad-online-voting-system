# Demo guide

A complete run of the system: a new voter and an existing Voter ID holder,
the Booth Level Officer, the Election Officer, candidates, voting, booth votes
uploaded as CSV, and the final result.

## 1. Set up

```bash
# Backend (needs MySQL or MariaDB with an empty database, configured in backend-python/.env)
cd backend-python
pip install -r requirements.txt
alembic upgrade head          # tables + Karnataka constituencies, pincodes, 5 demo voters

python -m app.scripts.create_staff --role ADMIN --email admin@voting.gov.in \
    --name "Election Officer" --password Admin@123
python -m app.scripts.create_staff --role FIELD_OFFICER --email officer@voting.gov.in \
    --name "Booth Level Officer Bengaluru South" --constituency "Bengaluru South" --password Officer@123

uvicorn app.main:app --port 8000

# Frontend, in another terminal
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

**Emails.** If `MAIL_USERNAME` is left empty in `.env`, emails aren't sent. Each one
(OTP codes, a candidate's temporary password, approvals, results) is printed in the
backend terminal instead, so keep that terminal visible during the demo. To send real
emails, set `MAIL_USERNAME`, `MAIL_PASSWORD` (a Gmail app password) and `MAIL_FROM`.

## 2. Accounts

| Who | Login tab | Email | Password |
|---|---|---|---|
| Election Officer | Election Staff | admin@voting.gov.in | Admin@123 |
| Booth Level Officer (Bengaluru South) | Election Staff | officer@voting.gov.in | Officer@123 |
| Candidates | Candidate | the email used on the nomination form | emailed on approval |
| Voters | Voter | the email they register with | their own |

Each account signs in only on its own tab. Voter and candidate accounts are
separate: someone who votes and also stands for election uses two emails.

Existing Voter IDs you can claim (all have demo data from the migrations):

| Voter ID | Name | Constituency |
|---|---|---|
| VID-BNSTH-2024-000001 | Anitha Reddy | Bengaluru South |
| VID-BNCS-2024-000001 | Priya Sharma | Bengaluru Central |
| VID-BNCS-2024-000002 | Ravi Kumar | Bengaluru Central |
| VID-MYS-2024-000001 | Suresh Gowda | Mysuru |
| VID-BNNTH-2024-000001 | Deepa Nair | Bengaluru North |

Use a Bengaluru South Voter ID, PIN code and election so everyone in the demo can
vote in the same election. Bengaluru South PIN codes: 560011, 560029, 560030,
560034, 560076, 560083, 560100.

## 3. The flow

1. **Election Officer creates the election.** Election Staff → New election.
   Pick *Bengaluru South*. The dates are prefilled. Then Elections → *Open nominations*.
2. **Candidates file nominations.** Register → *I want to stand for election*. Fill in
   the form for two or three candidates.
3. **Election Officer reviews nominations.** Nominations → Approve (the candidate gets
   a temporary password by email) or Reject with a reason.
4. **Candidate logs in.** Candidate tab with the emailed password. The dashboard
   shows the approved nomination.
5. **New voter registers.** Register → *I don't have a Voter ID yet* → sign in →
   Apply for Voter ID with a Bengaluru South PIN code.
6. **Booth Level Officer approves.** Voter ID applications → open the application →
   switch on *Physical verification* → Approve. A rejection needs a reason; the voter
   sees it and can apply again. The voter then sees their Voter ID number, the card
   and a notification.
7. **Voter with an existing Voter ID.** Register → *I already have a Voter ID* →
   `VID-BNSTH-2024-000001` → confirm → email → OTP → set a password.
8. **Voting.** Election Officer: Elections → *Close nominations* → *Open voting*.
   Each voter: Elections → *Vote now* → pick a candidate → *Confirm vote*. The list
   then shows *Voted ✓*. The public Results page shows the live count.
9. **Booth votes (CSV) and the result.** Election Officer: Elections → *Close voting*
   → *Enter results & declare*:
   1. *Download template*, fill in the votes per booth, *Upload CSV*.
   2. Check the totals (online + booth). The leader is highlighted, and you can still
      type corrections in the booth column.
   3. *Finalise & announce results*. The election becomes *Results declared*, the
      public Results page shows the final count, voters get a notification and
      candidates get an email.

## Booth results CSV

One row per booth per candidate. Votes are summed per candidate across all
booths and added to that candidate's online votes. Uploading again replaces the
booth counts from the previous upload.

```csv
booth,candidate_id,candidate_name,votes
Booth 1,1,Lakshmi Rao,120
Booth 1,2,Arjun Patil,95
Booth 2,1,Lakshmi Rao,88
Booth 2,2,Arjun Patil,140
```

- Required columns: `booth`, `votes`, and `candidate_id` or `candidate_name`. Header
  names are case-insensitive, and files saved from Excel work.
- Use the downloaded template, which already has the right candidate IDs and names.
- A file with mistakes is rejected as a whole, and the message lists the bad lines.
  The mistakes it catches: an unknown candidate, votes that aren't a whole number of
  0 or more, and a booth listed twice for the same candidate.
