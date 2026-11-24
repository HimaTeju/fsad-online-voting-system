# Demo guide

A complete run of the system in **Bengaluru South**: a new voter and an existing
Voter ID holder, the Booth Level Officer, the Election Officer, candidates, voting,
booth votes uploaded as CSV, and the final result.

## 1. Set up

```bash
# Backend (needs MySQL or MariaDB with an empty database, configured in backend-python/.env)
cd backend-python
pip install -r requirements.txt
alembic upgrade head              # tables + Karnataka constituencies, pincodes, 5 demo voters
python -m app.scripts.seed_demo   # staff accounts, the Bengaluru South election, 6 candidates
uvicorn app.main:app --port 8000

# Frontend, in another terminal
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

Run `seed_demo` on the day of the demo. The election's dates are set relative to when
you run it, so the background scheduler won't move it between stages by itself; you
move it by hand during the demo. Running it again is safe: anything that already
exists is left alone.

**To start over** (for example after a rehearsal), empty the database, then run
`alembic upgrade head` and `python -m app.scripts.seed_demo` again.

**Emails.** If `MAIL_USERNAME` is left empty in `.env`, emails aren't sent. Each one
(OTP codes, a candidate's temporary password, approvals, results) is printed in the
backend terminal instead, so keep that terminal visible during the demo. To send real
emails, set `MAIL_USERNAME`, `MAIL_PASSWORD` (a Gmail app password) and `MAIL_FROM`.

## 2. What the seed creates

**Election:** *Bengaluru South Lok Sabha Election 2026*, open for nominations.

**Accounts:**

| Who | Login tab | Email | Password |
|---|---|---|---|
| Election Officer | Election Staff | admin@voting.gov.in | Admin@123 |
| Booth Level Officer (Bengaluru South) | Election Staff | officer@voting.gov.in | Officer@123 |
| Lakshmi Rao, Janata Progress Party | Candidate | lakshmi.rao@example.com | Candidate@123 |
| Arjun Patil, Karnataka Vikas Front | Candidate | arjun.patil@example.com | Candidate@123 |
| Farah Siddiqui, Namma Bengaluru Party | Candidate | farah.siddiqui@example.com | Candidate@123 |
| Suresh Hegde, Green Earth Alliance | Candidate | suresh.hegde@example.com | Candidate@123 |
| Kavitha Reddy, People's Welfare Party | Candidate | kavitha.reddy@example.com | Candidate@123 |
| Manoj Kumar, Independent | Candidate | manoj.kumar@example.com | Candidate@123 |

All six candidates are already approved. Voters and any candidate who files a
nomination during the demo sign up themselves.

Each account signs in only on its own tab. Voter and candidate accounts are
separate: someone who votes and also stands for election uses two emails.

**Existing Voter ID to claim:** `VID-BNSTH-2024-000001` (Anitha Reddy, Bengaluru
South). It can be claimed once; start over to claim it again.

**Bengaluru South PIN codes** for new Voter ID applications: 560011, 560029, 560030,
560034, 560076, 560083, 560100.

**Booth votes:** [`demo/booth_results_bengaluru_south.csv`](demo/booth_results_bengaluru_south.csv),
with 708 votes from 5 booths for the six seeded candidates:

| Candidate | Booth votes |
|---|---|
| Lakshmi Rao | 215 |
| Arjun Patil | 196 |
| Farah Siddiqui | 107 |
| Kavitha Reddy | 87 |
| Suresh Hegde | 62 |
| Manoj Kumar | 41 |

Lakshmi Rao leads at the booths by 19 votes. Unless the online votes change that,
she is announced as the winner.

## 3. The flow

1. **Election Officer.** Election Staff tab → Elections: the Bengaluru South election
   is open for nominations, with six approved candidates.
2. **A candidate files a nomination.** Register → *I want to stand for election*,
   for example *Deepak Joshi*. Pick the Bengaluru South election and constituency.
3. **Election Officer reviews it.** Nominations → Approve (the temporary password is
   emailed or printed in the backend terminal) or Reject with a reason. The candidate
   signs in on the Candidate tab and sees the approved nomination. You can also sign
   in as a seeded candidate, e.g. lakshmi.rao@example.com / Candidate@123.
4. **New voter registers.** Register → *I don't have a Voter ID yet* → sign in →
   Apply for Voter ID with a Bengaluru South PIN code, e.g. 560076.
5. **Booth Level Officer approves.** Voter ID applications → open the application →
   switch on *Physical verification* → Approve. A rejection needs a reason; the voter
   sees it and can apply again. The voter then sees their Voter ID number, the card
   and a notification.
6. **Voter with an existing Voter ID.** Register → *I already have a Voter ID* →
   `VID-BNSTH-2024-000001` → confirm → email → OTP → set a password.
7. **Voting.** Election Officer: Elections → *Close nominations* → *Open voting*.
   Each voter: Elections → *Vote now* → pick a candidate → *Confirm vote*. The list
   then shows *Voted ✓*. The public Results page shows the live count.
8. **Booth votes and the result.** Election Officer: Elections → *Close voting* →
   *Enter results & declare*:
   1. *Upload CSV* → choose `demo/booth_results_bengaluru_south.csv`. The page
      confirms "30 rows from 5 booths, 708 booth votes imported".
   2. Check the totals: online + booth = total, with the leader highlighted. Booth
      counts can still be corrected by hand.
   3. *Finalise & announce results*. The election becomes *Results declared*, the
      public Results page shows the final count, voters get a notification and
      candidates get an email.

## Booth results CSV format

One row per booth per candidate. Votes are summed per candidate across all
booths and added to that candidate's online votes. Uploading again replaces the
booth counts from the previous upload. Candidates missing from the file get 0.

```csv
booth,candidate_name,votes
Booth 101 - Jayanagar,Lakshmi Rao,42
Booth 101 - Jayanagar,Arjun Patil,38
```

- Required columns: `booth`, `votes`, and `candidate_name` or `candidate_id`. Header
  names are case-insensitive, and files saved from Excel work.
- *Download template* on the results page gives a file with every candidate already
  listed, including anyone nominated during the demo.
- A file with mistakes is rejected as a whole, and the message lists the bad lines.
  The mistakes it catches: an unknown candidate, votes that aren't a whole number of
  0 or more, and a booth listed twice for the same candidate.
