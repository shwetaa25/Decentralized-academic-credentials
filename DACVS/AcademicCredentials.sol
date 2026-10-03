// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AcademicCredentialRegistry
 * @notice Blockchain-based academic credential registry.
 *         Only the document hash + essential metadata are stored on-chain.
 *         Credentials can be revoked but are never deleted.
 */
contract AcademicCredentialRegistry {
    // ------------------------------------------------------------
    // State
    // ------------------------------------------------------------
    address public admin; // administrator / issuer, set at deployment
    uint256 public totalIssued;

    struct Credential {
        string credentialId;      // unique ID, e.g. "CERT-2026-001"
        string studentName;
        string enrollmentNo;
        string programme;         // e.g. "M.Sc. IT"
        string grade;             // result / grade
        uint256 issueDate;        // block timestamp at issuance
        bytes32 documentHash;     // hash of the certificate document
        bool revoked;
        uint256 revokedAt;        // 0 if not revoked
        string revocationReason;
        bool exists;
    }

    mapping(string => Credential) private credentials; // credentialId => record
    mapping(bytes32 => bool) private hashRegistered;   // prevents same document twice

    // ------------------------------------------------------------
    // Events
    // ------------------------------------------------------------
    event CredentialIssued(
        string credentialId,
        address indexed issuer,
        bytes32 indexed documentHash,
        uint256 issueDate
    );

    event CredentialVerified(
        string credentialId,
        address indexed verifier,
        bool isValid,
        string status
    );

    event CredentialRevoked(
        string credentialId,
        address indexed revokedBy,
        string reason,
        uint256 revokedAt
    );

    // ------------------------------------------------------------
    // Access control
    // ------------------------------------------------------------
    modifier onlyAdmin() {
        require(msg.sender == admin, "Unauthorized: only admin/issuer");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // ------------------------------------------------------------
    // Issue
    // ------------------------------------------------------------
    function issueCredential(
        string memory credentialId,
        string memory studentName,
        string memory enrollmentNo,
        string memory programme,
        string memory grade,
        bytes32 documentHash
    ) external onlyAdmin {
        require(bytes(credentialId).length > 0, "Credential ID required");
        require(bytes(studentName).length > 0, "Student name required");
        require(documentHash != bytes32(0), "Document hash required");
        require(!credentials[credentialId].exists, "Duplicate credential ID");
        require(!hashRegistered[documentHash], "Document hash already registered");

        Credential storage c = credentials[credentialId];
        c.credentialId = credentialId;
        c.studentName = studentName;
        c.enrollmentNo = enrollmentNo;
        c.programme = programme;
        c.grade = grade;
        c.issueDate = block.timestamp;
        c.documentHash = documentHash;
        c.exists = true;

        hashRegistered[documentHash] = true;
        totalIssued += 1;

        emit CredentialIssued(credentialId, msg.sender, documentHash, block.timestamp);
    }

    // ------------------------------------------------------------
    // Revoke (record is kept, only flagged)
    // ------------------------------------------------------------
    function revokeCredential(string memory credentialId, string memory reason)
        external
        onlyAdmin
    {
        Credential storage c = credentials[credentialId];
        require(c.exists, "Credential not found");
        require(!c.revoked, "Already revoked");

        c.revoked = true;
        c.revokedAt = block.timestamp;
        c.revocationReason = reason;

        emit CredentialRevoked(credentialId, msg.sender, reason, block.timestamp);
    }

    // ------------------------------------------------------------
    // Public lookup and verification
    // ------------------------------------------------------------

    /// @notice Public lookup of the full credential record.
    function getCredential(string memory credentialId)
        external
        view
        returns (Credential memory)
    {
        require(credentials[credentialId].exists, "Credential not found");
        return credentials[credentialId];
    }

    /// @notice Free (no gas) hash-based verification.
    function verifyCredential(string memory credentialId, bytes32 submittedHash)
        public
        view
        returns (bool isValid, string memory status)
    {
        Credential storage c = credentials[credentialId];

        if (!c.exists) return (false, "NOT_FOUND");
        if (c.documentHash != submittedHash) return (false, "HASH_MISMATCH");
        if (c.revoked) return (false, "REVOKED");
        return (true, "VALID");
    }

    /// @notice Same check as verifyCredential, but records the result as an
    ///         on-chain event (a transaction, so it costs gas in a real network).
    function verifyAndLog(string memory credentialId, bytes32 submittedHash)
        external
        returns (bool isValid, string memory status)
    {
        (isValid, status) = verifyCredential(credentialId, submittedHash);
        emit CredentialVerified(credentialId, msg.sender, isValid, status);
    }

    // ------------------------------------------------------------
    // Helper for demonstration only
    // ------------------------------------------------------------

    /// @notice Hash any text in Remix to get a bytes32 to use as documentHash.
    function computeHash(string memory documentText) external pure returns (bytes32) {
        return keccak256(bytes(documentText));
    }
}
