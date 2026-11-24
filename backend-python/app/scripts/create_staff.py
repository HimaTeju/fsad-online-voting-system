"""Create or update an Election Officer (ADMIN) or Booth Level Officer account.

There is no sign-up path for staff, so use this after `alembic upgrade head`:

    python -m app.scripts.create_staff --role ADMIN --email admin@voting.gov.in \
        --name "Election Officer" --password '<password>'

    python -m app.scripts.create_staff --role FIELD_OFFICER --email officer@voting.gov.in \
        --name "Booth Level Officer Bengaluru South" --constituency "Bengaluru South" \
        --password '<password>'

Omit --password to be prompted for it.
"""
import argparse
import getpass
import sys

from app.database import SessionLocal
from app.models.constituency import Constituency
from app.models.enums import Role
from app.models.user import User
from app.security.passwords import hash_password


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--role", required=True, choices=[Role.ADMIN.value, Role.FIELD_OFFICER.value])
    p.add_argument("--email", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--constituency", help="Constituency name (required for FIELD_OFFICER)")
    p.add_argument("--password")
    args = p.parse_args(argv)

    if args.role == Role.FIELD_OFFICER.value and not args.constituency:
        p.error("--constituency is required for FIELD_OFFICER")
    password = args.password or getpass.getpass("Password: ")
    if len(password) < 8:
        p.error("password must be at least 8 characters")

    db = SessionLocal()
    try:
        constituency_id = None
        if args.constituency:
            c = db.query(Constituency).filter(Constituency.name == args.constituency).first()
            if not c:
                print(f"Unknown constituency: {args.constituency}", file=sys.stderr)
                return 1
            constituency_id = c.id

        user = db.query(User).filter(User.email == args.email).first()
        action = "Updated" if user else "Created"
        if not user:
            user = User(email=args.email)
            db.add(user)
        user.full_name = args.name
        user.role = Role(args.role)
        user.password_hash = hash_password(password)
        user.is_active = True
        user.email_verified = True
        user.constituency_id = constituency_id
        db.commit()
        print(f"{action} {args.role} account {args.email}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
