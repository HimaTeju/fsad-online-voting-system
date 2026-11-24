import enum


class Role(str, enum.Enum):
    VOTER = "VOTER"
    CANDIDATE = "CANDIDATE"
    ADMIN = "ADMIN"
    FIELD_OFFICER = "FIELD_OFFICER"


class ElectionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    NOMINATION_OPEN = "NOMINATION_OPEN"
    NOMINATION_CLOSED = "NOMINATION_CLOSED"
    VOTING_OPEN = "VOTING_OPEN"
    VOTING_CLOSED = "VOTING_CLOSED"
    RESULTS_DECLARED = "RESULTS_DECLARED"


class ElectionType(str, enum.Enum):
    GENERAL = "GENERAL"
    STATE = "STATE"
    LOCAL = "LOCAL"


class ApplicationStatus(str, enum.Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class NominationStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Gender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class NotificationType(str, enum.Enum):
    APPLICATION_STATUS = "APPLICATION_STATUS"
    VOTE_CONFIRMATION = "VOTE_CONFIRMATION"
    ELECTION_OPEN = "ELECTION_OPEN"
    RESULT_DECLARED = "RESULT_DECLARED"
    MESSAGE = "MESSAGE"
    SYSTEM = "SYSTEM"


class ThreadType(str, enum.Enum):
    DISCUSSION = "DISCUSSION"
    CAMPAIGN = "CAMPAIGN"
