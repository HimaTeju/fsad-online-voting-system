import hmac
import hashlib


def compute_voter_token(voter_profile_id: int, election_id: int, vote_salt: str) -> str:
    message = f"{voter_profile_id}|{election_id}".encode()
    key = vote_salt.encode()
    return hmac.new(key, message, hashlib.sha256).hexdigest()
