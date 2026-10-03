import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState("");
  const [activeTab, setActiveTab] = useState("issue");

  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  const [adminAddr, setAdminAddr] = useState("");
  const [totalIssued, setTotalIssued] = useState("0");

  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState(null);
  const [configError, setConfigError] = useState("");

  // ============================================================
  // GET CONTRACT CONFIGURATION FROM REMIX QUICK DAPP
  // ============================================================

  const resolveContract = useCallback(() => {
    const cfg = window.__QUICK_DAPP_CONFIG__;

    if (
      !cfg ||
      !cfg.contracts ||
      !Array.isArray(cfg.contracts) ||
      cfg.contracts.length === 0
    ) {
      return null;
    }

    const binding = cfg.primaryContractId
      ? cfg.contracts.find((c) => c.id === cfg.primaryContractId)
      : cfg.contracts[0];

    if (!binding || !binding.address || !binding.abi) {
      return null;
    }

    return binding;
  }, []);

  // ============================================================
  // CONNECT WALLET
  // ============================================================

  const connectWallet = useCallback(async () => {
    try {
      setConfigError("");

      if (!window.ethereum) {
        setTxStatus({
          type: "error",
          message: "No browser wallet found. Please use a wallet-enabled browser.",
        });
        return;
      }

      const binding = resolveContract();

      if (!binding) {
        setConfigError(
          "Contract configuration was not found. Please make sure your Remix DApp is connected to the deployed contract."
        );
        return;
      }

      const browserProvider = new ethers.BrowserProvider(
        window.ethereum
      );

      await browserProvider.send("eth_requestAccounts", []);

      const walletSigner = await browserProvider.getSigner();

      const academicContract = new ethers.Contract(
        binding.address,
        binding.abi,
        walletSigner
      );

      const walletAddress = await walletSigner.getAddress();

      setProvider(browserProvider);
      setSigner(walletSigner);
      setContract(academicContract);
      setAccount(walletAddress);
      setConnected(true);
    } catch (error) {
      console.error(error);

      setTxStatus({
        type: "error",
        message:
          "Wallet connection failed: " +
          (error.message || "Unknown error"),
      });
    }
  }, [resolveContract]);

  // ============================================================
  // ACCOUNT CHANGE
  // ============================================================

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setConnected(false);
        setAccount("");
        setSigner(null);
        setContract(null);
        return;
      }

      try {
        const binding = resolveContract();

        if (!binding) return;

        const browserProvider = new ethers.BrowserProvider(
          window.ethereum
        );

        const walletSigner = await browserProvider.getSigner();

        const academicContract = new ethers.Contract(
          binding.address,
          binding.abi,
          walletSigner
        );

        setProvider(browserProvider);
        setSigner(walletSigner);
        setContract(academicContract);
        setAccount(accounts[0]);
        setConnected(true);
      } catch (error) {
        console.error(error);
      }
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener?.(
        "accountsChanged",
        handleAccountsChanged
      );
    };
  }, [resolveContract]);

  // ============================================================
  // LOAD ADMIN + TOTAL ISSUED
  // ============================================================

  const refreshData = useCallback(async () => {
    if (!contract) return;

    try {
      const admin = await contract.admin();
      const total = await contract.totalIssued();

      setAdminAddr(admin);
      setTotalIssued(total.toString());
    } catch (error) {
      console.error("Could not load contract data:", error);
    }
  }, [contract]);

  useEffect(() => {
    if (contract) {
      refreshData();
    }
  }, [contract, refreshData]);

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const shortAddress = (address) => {
    if (!address) return "";

    return (
      address.substring(0, 6) +
      "..." +
      address.substring(address.length - 4)
    );
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error(error);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setTxStatus(null);
  };

  // ============================================================
  // CONFIG ERROR
  // ============================================================

  if (configError) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>

          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Configuration Error
          </h2>

          <p className="text-slate-500 mb-6">
            {configError}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          >
            Reload DApp
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // CONNECT SCREEN
  // ============================================================

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-6">

        <div className="max-w-xl w-full">

          <div className="text-center text-white mb-8">

            <div className="text-6xl mb-5">
              🎓
            </div>

            <h1 className="text-4xl font-extrabold mb-3">
              Academic Credential Registry
            </h1>

            <p className="text-white/80 text-lg">
              Blockchain-based Academic Credentials
              Verification System
            </p>

          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">

            <div className="grid grid-cols-3 gap-4 mb-8">

              <FeatureCard
                icon="🎓"
                title="Issue"
              />

              <FeatureCard
                icon="🔍"
                title="Verify"
              />

              <FeatureCard
                icon="🔒"
                title="Secure"
              />

            </div>

            <button
              onClick={connectWallet}
              className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 transition"
            >
              🔗 Connect Wallet
            </button>

            <p className="text-center text-sm text-slate-400 mt-4">
              Connect your wallet to access the credential registry.
            </p>

          </div>

        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN APP
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">

        <div className="max-w-7xl mx-auto px-6 py-4">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-2xl">
                🎓
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  Academic Credential Registry
                </h1>

                <p className="text-xs text-slate-500">
                  Blockchain-based credential verification
                </p>
              </div>

            </div>

            <div className="flex items-center gap-3">

              <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-xl">

                <span className="text-xs text-green-700 font-semibold">
                  ● Connected
                </span>

              </div>

              <button
                onClick={() => copyText(account)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-mono text-slate-600 hover:bg-slate-200"
              >
                {shortAddress(account)}
              </button>

            </div>

          </div>

          {/* NAVIGATION */}

          <div className="flex gap-2 mt-5 overflow-x-auto pb-1">

            <NavButton
              active={activeTab === "issue"}
              onClick={() => switchTab("issue")}
              icon="🎓"
              label="Issue"
            />

            <NavButton
              active={activeTab === "verify"}
              onClick={() => switchTab("verify")}
              icon="🔍"
              label="Verify"
            />

            <NavButton
              active={activeTab === "view"}
              onClick={() => switchTab("view")}
              icon="📋"
              label="View Credential"
            />

            <NavButton
              active={activeTab === "revoke"}
              onClick={() => switchTab("revoke")}
              icon="⛔"
              label="Revoke"
            />

            <NavButton
              active={activeTab === "hash"}
              onClick={() => switchTab("hash")}
              icon="🔐"
              label="Hash Generator"
            />

            <NavButton
              active={activeTab === "stats"}
              onClick={() => switchTab("stats")}
              icon="📊"
              label="Dashboard"
            />

          </div>

        </div>

      </header>

      {/* MAIN */}

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* TRANSACTION STATUS */}

        {txStatus && (
          <StatusMessage
            status={txStatus}
            onClose={() => setTxStatus(null)}
          />
        )}

        {/* TABS */}

        {activeTab === "issue" && (
          <IssueCredential
            contract={contract}
            account={account}
            adminAddr={adminAddr}
            loading={loading}
            setLoading={setLoading}
            setTxStatus={setTxStatus}
            refreshData={refreshData}
          />
        )}

        {activeTab === "verify" && (
          <VerifyCredential
            contract={contract}
            loading={loading}
            setLoading={setLoading}
            setTxStatus={setTxStatus}
          />
        )}

        {activeTab === "view" && (
          <ViewCredential
            contract={contract}
            loading={loading}
            setLoading={setLoading}
            setTxStatus={setTxStatus}
          />
        )}

        {activeTab === "revoke" && (
          <RevokeCredential
            contract={contract}
            account={account}
            adminAddr={adminAddr}
            loading={loading}
            setLoading={setLoading}
            setTxStatus={setTxStatus}
          />
        )}

        {activeTab === "hash" && (
          <HashGenerator
            contract={contract}
          />
        )}

        {activeTab === "stats" && (
          <Dashboard
            adminAddr={adminAddr}
            account={account}
            totalIssued={totalIssued}
            refreshData={refreshData}
          />
        )}

      </main>

      <footer className="text-center py-8 text-sm text-slate-400">
        Academic Credential Verification System • Blockchain Powered
      </footer>

    </div>
  );
}

// ============================================================
// FEATURE CARD
// ============================================================

function FeatureCard({ icon, title }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">

      <div className="text-3xl mb-2">
        {icon}
      </div>

      <p className="font-semibold text-slate-700">
        {title}
      </p>

    </div>
  );
}

// ============================================================
// NAV BUTTON
// ============================================================

function NavButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap font-medium transition ${
        active
          ? "bg-indigo-600 text-white shadow-md"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

// ============================================================
// STATUS MESSAGE
// ============================================================

function StatusMessage({ status, onClose }) {
  const bg =
    status.type === "success"
      ? "bg-green-50 border-green-200 text-green-700"
      : status.type === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-blue-50 border-blue-200 text-blue-700";

  return (
    <div
      className={`mb-6 border rounded-2xl p-4 flex items-start justify-between gap-4 ${bg}`}
    >

      <div>

        <p className="font-medium">
          {status.message}
        </p>

        {status.hash && (
          <p className="text-xs font-mono mt-2 break-all opacity-70">
            Transaction: {status.hash}
          </p>
        )}

      </div>

      <button
        onClick={onClose}
        className="text-lg"
      >
        ×
      </button>

    </div>
  );
}

// ============================================================
// ISSUE CREDENTIAL
// ============================================================

function IssueCredential({
  contract,
  account,
  adminAddr,
  loading,
  setLoading,
  setTxStatus,
  refreshData,
}) {
  const [credentialId, setCredentialId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [programme, setProgramme] = useState("");
  const [grade, setGrade] = useState("");
  const [documentHash, setDocumentHash] = useState("");

  const isAdmin =
    adminAddr &&
    account &&
    adminAddr.toLowerCase() === account.toLowerCase();

  const handleIssue = async (event) => {
    event.preventDefault();

    if (
      !credentialId ||
      !studentName ||
      !enrollmentNo ||
      !programme ||
      !grade ||
      !documentHash
    ) {
      setTxStatus({
        type: "error",
        message: "Please fill in all fields.",
      });

      return;
    }

    if (!isAdmin) {
      setTxStatus({
        type: "error",
        message: "Only the admin can issue credentials.",
      });

      return;
    }

    try {
      setLoading(true);

      setTxStatus({
        type: "pending",
        message: "Issuing credential on blockchain...",
      });

      let hashBytes32 = documentHash.trim();

      if (!hashBytes32.startsWith("0x")) {
        hashBytes32 = ethers.id(hashBytes32);
      }

      if (!/^0x[0-9a-fA-F]{64}$/.test(hashBytes32)) {
        throw new Error(
          "Document hash must be a valid bytes32 value."
        );
      }

      /*
       IMPORTANT:
       Solidity function:

       issueCredential(
          credentialId,
          studentName,
          enrollmentNo,
          programme,
          grade,
          documentHash
       )
      */

      const tx = await contract.issueCredential(
        credentialId,
        studentName,
        enrollmentNo,
        programme,
        grade,
        hashBytes32
      );

      setTxStatus({
        type: "pending",
        message: "Transaction sent. Waiting for confirmation...",
        hash: tx.hash,
      });

      await tx.wait();

      setTxStatus({
        type: "success",
        message: "Credential issued successfully! 🎓",
        hash: tx.hash,
      });

      setCredentialId("");
      setStudentName("");
      setEnrollmentNo("");
      setProgramme("");
      setGrade("");
      setDocumentHash("");

      await refreshData();

    } catch (error) {

      console.error(error);

      setTxStatus({
        type: "error",
        message:
          "Failed to issue credential: " +
          (error.reason ||
            error.shortMessage ||
            error.message ||
            "Unknown error"),
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">

      <SectionHeader
        icon="🎓"
        title="Issue Academic Credential"
        description="Create and store a new academic credential on the blockchain."
      />

      {!isAdmin && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-2xl p-4">
          ⚠️ You are not the contract admin. Only the admin can issue credentials.
        </div>
      )}

      <form
        onSubmit={handleIssue}
        className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8"
      >

        <div className="grid md:grid-cols-2 gap-6">

          <Input
            label="Credential ID"
            value={credentialId}
            onChange={setCredentialId}
            placeholder="CERT-2026-001"
          />

          <Input
            label="Student Name"
            value={studentName}
            onChange={setStudentName}
            placeholder="Shweta Patil"
          />

          <Input
            label="Enrollment No."
            value={enrollmentNo}
            onChange={setEnrollmentNo}
            placeholder="MSCIT-001"
          />

          <Input
            label="Programme"
            value={programme}
            onChange={setProgramme}
            placeholder="M.Sc. IT"
          />

          <Input
            label="Grade"
            value={grade}
            onChange={setGrade}
            placeholder="A"
          />

          <Input
            label="Document Hash (bytes32)"
            value={documentHash}
            onChange={setDocumentHash}
            placeholder="0x..."
            mono
          />

        </div>

        <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
          💡 You can generate the document hash from the
          <strong> Hash Generator </strong>
          tab.
        </div>

        <button
          type="submit"
          disabled={loading || !isAdmin}
          className="w-full mt-6 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading
            ? "⏳ Issuing Credential..."
            : "🎓 Issue Credential"}
        </button>

      </form>
    </div>
  );
}

// ============================================================
// VERIFY CREDENTIAL
// ============================================================

function VerifyCredential({
  contract,
  loading,
  setLoading,
  setTxStatus,
}) {
  const [credentialId, setCredentialId] = useState("");
  const [documentHash, setDocumentHash] = useState("");
  const [result, setResult] = useState(null);

  const verify = async (event, logOnChain = false) => {
    event.preventDefault();

    if (!credentialId || !documentHash) {
      setTxStatus({
        type: "error",
        message: "Please enter Credential ID and Document Hash.",
      });

      return;
    }

    try {
      setLoading(true);
      setResult(null);

      let hashBytes32 = documentHash.trim();

      if (!hashBytes32.startsWith("0x")) {
        hashBytes32 = ethers.id(hashBytes32);
      }

      if (!/^0x[0-9a-fA-F]{64}$/.test(hashBytes32)) {
        throw new Error(
          "Document hash must be a valid bytes32 value."
        );
      }

      if (!logOnChain) {

        const [isValid, status] =
          await contract.verifyCredential(
            credentialId,
            hashBytes32
          );

        setResult({
          valid: isValid,
          status: status,
        });

        setTxStatus({
          type: isValid ? "success" : "error",
          message:
            "Verification result: " + status,
        });

      } else {

        setTxStatus({
          type: "pending",
          message: "Submitting verification to blockchain...",
        });

        const tx = await contract.verifyAndLog(
          credentialId,
          hashBytes32
        );

        setTxStatus({
          type: "pending",
          message: "Waiting for transaction confirmation...",
          hash: tx.hash,
        });

        await tx.wait();

        const [isValid, status] =
          await contract.verifyCredential(
            credentialId,
            hashBytes32
          );

        setResult({
          valid: isValid,
          status: status,
          logged: true,
        });

        setTxStatus({
          type: "success",
          message:
            "Verification completed and logged on-chain.",
          hash: tx.hash,
        });
      }

    } catch (error) {

      console.error(error);

      setTxStatus({
        type: "error",
        message:
          "Verification failed: " +
          (error.reason ||
            error.shortMessage ||
            error.message ||
            "Unknown error"),
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">

      <SectionHeader
        icon="🔍"
        title="Verify Credential"
        description="Verify an academic credential using its ID and document hash."
      />

      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8">

        <form
          onSubmit={(e) => verify(e, false)}
          className="space-y-6"
        >

          <Input
            label="Credential ID"
            value={credentialId}
            onChange={setCredentialId}
            placeholder="CERT-2026-001"
          />

          <Input
            label="Document Hash (bytes32)"
            value={documentHash}
            onChange={setDocumentHash}
            placeholder="0x..."
            mono
          />

          <div className="grid md:grid-cols-2 gap-4">

            <button
              type="submit"
              disabled={loading}
              className="py-4 rounded-2xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50"
            >
              {loading
                ? "⏳ Checking..."
                : "🔍 Verify Credential"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={(e) => verify(e, true)}
              className="py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              ⛓️ Verify & Log
            </button>

          </div>

        </form>

        {result && (
          <div
            className={`mt-8 rounded-2xl p-6 border ${
              result.valid
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >

            <div className="text-4xl mb-3">
              {result.valid ? "✅" : "❌"}
            </div>

            <h3
              className={`text-2xl font-bold ${
                result.valid
                  ? "text-green-700"
                  : "text-red-700"
              }`}
            >
              {result.status}
            </h3>

            <p className="text-slate-600 mt-2">
              Credential ID:{" "}
              <strong>{credentialId}</strong>
            </p>

            {result.logged && (
              <p className="text-indigo-600 font-semibold mt-2">
                ✓ Verification logged on-chain
              </p>
            )}

          </div>
        )}

      </div>

    </div>
  );
}

// ============================================================
// VIEW CREDENTIAL
// ============================================================

function ViewCredential({
  contract,
  loading,
  setLoading,
  setTxStatus,
}) {
  const [credentialId, setCredentialId] = useState("");
  const [record, setRecord] = useState(null);

  const fetchCredential = async (event) => {
    event.preventDefault();

    if (!credentialId) {
      setTxStatus({
        type: "error",
        message: "Please enter a Credential ID.",
      });

      return;
    }

    try {
      setLoading(true);
      setRecord(null);

      const data = await contract.getCredential(
        credentialId
      );

      /*
       Credential struct:

       0 credentialId
       1 studentName
       2 enrollmentNo
       3 programme
       4 grade
       5 issueDate
       6 documentHash
       7 revoked
       8 revokedAt
       9 revocationReason
       10 exists
      */

      setRecord({
        credentialId: data[0],
        studentName: data[1],
        enrollmentNo: data[2],
        programme: data[3],
        grade: data[4],
        issueDate: data[5],
        documentHash: data[6],
        revoked: data[7],
        revokedAt: data[8],
        revocationReason: data[9],
        exists: data[10],
      });

      setTxStatus({
        type: "success",
        message: "Credential record loaded successfully.",
      });

    } catch (error) {

      console.error(error);

      setTxStatus({
        type: "error",
        message:
          "Credential not found: " +
          (error.reason ||
            error.shortMessage ||
            error.message ||
            "Unknown error"),
      });

    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return "—";

      return new Date(
        Number(timestamp) * 1000
      ).toLocaleString();
    } catch {
      return "—";
    }
  };

  return (
    <div className="max-w-5xl mx-auto">

      <SectionHeader
        icon="📋"
        title="View Credential"
        description="Search and view the complete academic credential record."
      />

      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8">

        <form
          onSubmit={fetchCredential}
          className="flex flex-col md:flex-row gap-4"
        >

          <div className="flex-1">
            <Input
              label="Credential ID"
              value={credentialId}
              onChange={setCredentialId}
              placeholder="CERT-2026-001"
            />
          </div>

          <div className="md:pt-7">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "⏳ Loading..." : "📋 View Credential"}
            </button>
          </div>

        </form>

        {record && (
          <div className="mt-8 border border-slate-200 rounded-2xl overflow-hidden">

            <div className="bg-indigo-600 text-white px-6 py-4">
              <h3 className="font-bold text-lg">
                Credential Details
              </h3>
            </div>

            <RecordRow
              label="Credential ID"
              value={record.credentialId}
            />

            <RecordRow
              label="Student Name"
              value={record.studentName}
            />

            <RecordRow
              label="Enrollment No."
              value={record.enrollmentNo}
            />

            <RecordRow
              label="Programme"
              value={record.programme}
            />

            <RecordRow
              label="Grade"
              value={record.grade}
            />

            <RecordRow
              label="Issue Date"
              value={formatDate(record.issueDate)}
            />

            <RecordRow
              label="Document Hash"
              value={record.documentHash}
              mono
            />

            <RecordRow
              label="Status"
              value={
                record.revoked
                  ? "⛔ REVOKED"
                  : "✅ VALID"
              }
              status
              revoked={record.revoked}
            />

            {record.revoked && (
              <>
                <RecordRow
                  label="Revoked At"
                  value={formatDate(record.revokedAt)}
                />

                <RecordRow
                  label="Revocation Reason"
                  value={record.revocationReason}
                />
              </>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

// ============================================================
// REVOKE CREDENTIAL
// ============================================================

function RevokeCredential({
  contract,
  account,
  adminAddr,
  loading,
  setLoading,
  setTxStatus,
}) {
  const [credentialId, setCredentialId] = useState("");
  const [reason, setReason] = useState("");

  const isAdmin =
    adminAddr &&
    account &&
    adminAddr.toLowerCase() === account.toLowerCase();

  const handleRevoke = async (event) => {
    event.preventDefault();

    if (!credentialId || !reason) {
      setTxStatus({
        type: "error",
        message: "Please enter Credential ID and reason.",
      });

      return;
    }

    if (!isAdmin) {
      setTxStatus({
        type: "error",
        message: "Only the admin can revoke credentials.",
      });

      return;
    }

    try {
      setLoading(true);

      setTxStatus({
        type: "pending",
        message: "Revoking credential...",
      });

      const tx = await contract.revokeCredential(
        credentialId,
        reason
      );

      setTxStatus({
        type: "pending",
        message: "Transaction sent. Waiting for confirmation...",
        hash: tx.hash,
      });

      await tx.wait();

      setTxStatus({
        type: "success",
        message: "Credential revoked successfully. ⛔",
        hash: tx.hash,
      });

      setCredentialId("");
      setReason("");

    } catch (error) {

      console.error(error);

      setTxStatus({
        type: "error",
        message:
          "Failed to revoke: " +
          (error.reason ||
            error.shortMessage ||
            error.message ||
            "Unknown error"),
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">

      <SectionHeader
        icon="⛔"
        title="Revoke Credential"
        description="Revoke an issued credential. The blockchain record will remain permanently stored."
      />

      {!isAdmin && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-2xl p-4">
          ⚠️ Only the administrator can revoke credentials.
        </div>
      )}

      <form
        onSubmit={handleRevoke}
        className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8"
      >

        <div className="space-y-6">

          <Input
            label="Credential ID"
            value={credentialId}
            onChange={setCredentialId}
            placeholder="CERT-2026-001"
          />

          <Input
            label="Reason for Revocation"
            value={reason}
            onChange={setReason}
            placeholder="Incorrect academic information"
          />

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            ⚠️ After revocation, the credential will fail verification.
            The record itself will not be deleted.
          </div>

          <button
            type="submit"
            disabled={loading || !isAdmin}
            className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50"
          >
            {loading
              ? "⏳ Revoking..."
              : "⛔ Revoke Credential"}
          </button>

        </div>

      </form>

    </div>
  );
}

// ============================================================
// HASH GENERATOR
// ============================================================

function HashGenerator({ contract }) {
  const [text, setText] = useState("");
  const [hash, setHash] = useState("");
  const [loading, setLoading] = useState(false);

  const generateHash = async () => {
    if (!text) return;

    try {
      setLoading(true);

      const result = await contract.computeHash(text);

      setHash(result);

    } catch (error) {

      console.error(error);

      // Same keccak256 operation using ethers
      setHash(ethers.id(text));

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">

      <SectionHeader
        icon="🔐"
        title="Document Hash Generator"
        description="Generate a bytes32 document hash for credential issuance and verification."
      />

      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8">

        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Document Text
        </label>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Enter certificate/document text..."
          className="w-full border border-slate-300 rounded-xl px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <button
          onClick={generateHash}
          disabled={!text || loading}
          className="w-full mt-5 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading
            ? "⏳ Generating..."
            : "🔐 Generate Document Hash"}
        </button>

        {hash && (
          <div className="mt-8">

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Generated Document Hash (bytes32)
            </label>

            <div className="bg-slate-900 text-green-400 rounded-xl p-5 font-mono text-sm break-all">
              {hash}
            </div>

            <button
              onClick={() => navigator.clipboard?.writeText(hash)}
              className="mt-3 px-5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              📋 Copy Hash
            </button>

            <p className="text-sm text-slate-500 mt-4">
              Copy this hash and use it as the Document Hash when
              issuing or verifying the credential.
            </p>

          </div>
        )}

      </div>

    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

function Dashboard({
  adminAddr,
  account,
  totalIssued,
  refreshData,
}) {
  const isAdmin =
    adminAddr &&
    account &&
    adminAddr.toLowerCase() === account.toLowerCase();

  return (
    <div className="max-w-5xl mx-auto">

      <SectionHeader
        icon="📊"
        title="Registry Dashboard"
        description="Overview of your academic credential blockchain registry."
      />

      <div className="grid md:grid-cols-3 gap-6">

        <StatCard
          icon="📜"
          title="Total Issued"
          value={totalIssued}
        />

        <StatCard
          icon="👤"
          title="Your Role"
          value={isAdmin ? "Administrator" : "Verifier"}
        />

        <StatCard
          icon="🔗"
          title="Wallet"
          value={
            account
              ? account.substring(0, 8) + "..."
              : "Not connected"
          }
        />

      </div>

      <div className="mt-6 bg-white rounded-3xl shadow-lg border border-slate-200 p-6">

        <h3 className="font-bold text-lg text-slate-800 mb-4">
          Administrator
        </h3>

        <p className="font-mono text-sm text-slate-600 break-all">
          {adminAddr || "Loading..."}
        </p>

      </div>

      <button
        onClick={refreshData}
        className="mt-6 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
      >
        🔄 Refresh Dashboard
      </button>

    </div>
  );
}

// ============================================================
// SECTION HEADER
// ============================================================

function SectionHeader({
  icon,
  title,
  description,
}) {
  return (
    <div className="mb-6">

      <div className="flex items-center gap-4">

        <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-3xl">
          {icon}
        </div>

        <div>

          <h2 className="text-2xl font-bold text-slate-800">
            {title}
          </h2>

          <p className="text-slate-500">
            {description}
          </p>

        </div>

      </div>

    </div>
  );
}

// ============================================================
// INPUT
// ============================================================

function Input({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
}) {
  return (
    <div>

      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
          mono ? "font-mono text-sm" : ""
        }`}
      />

    </div>
  );
}

// ============================================================
// RECORD ROW
// ============================================================

function RecordRow({
  label,
  value,
  mono = false,
  status = false,
  revoked = false,
}) {
  return (
    <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:justify-between gap-2">

      <span className="font-medium text-slate-500">
        {label}
      </span>

      <span
        className={`md:text-right ${
          mono ? "font-mono text-sm break-all" : ""
        } ${
          status
            ? revoked
              ? "text-red-600 font-bold"
              : "text-green-600 font-bold"
            : "text-slate-800"
        }`}
      >
        {value || "—"}
      </span>

    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  icon,
  title,
  value,
}) {
  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">

      <div className="text-3xl mb-4">
        {icon}
      </div>

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="text-2xl font-bold text-slate-800 mt-1">
        {value}
      </p>

    </div>
  );
}