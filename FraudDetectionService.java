package com.fraud.service;

import com.fraud.dto.Dto.*;
import com.fraud.ml.MlServiceClient;
import com.fraud.model.*;
import com.fraud.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class FraudDetectionService {
    private static final Logger log = LoggerFactory.getLogger(FraudDetectionService.class);
    private final TransactionRepository txnRepo;
    private final AlertRepository alertRepo;
    private final MlServiceClient mlClient;

    @Value("${fraud.threshold.high-risk}") private Double highRisk;
    @Value("${fraud.threshold.medium-risk}") private Double mediumRisk;

    public TransactionResponse processTransaction(TransactionRequest req, String userId) {
        Transaction txn = Transaction.builder()
            .transactionId(req.getTransactionId()).userId(userId)
            .amount(req.getAmount()).currency(req.getCurrency() != null ? req.getCurrency() : "USD")
            .type(req.getType() != null ? req.getType() : "PURCHASE")
            .merchantName(req.getMerchantName()).merchantCategory(req.getMerchantCategory())
            .ipAddress(req.getIpAddress()).location(req.getLocation()).cardLastFour(req.getCardLastFour())
            .v1(req.getV1()).v2(req.getV2()).v3(req.getV3()).v4(req.getV4()).v5(req.getV5())
            .v6(req.getV6()).v7(req.getV7()).v8(req.getV8()).v9(req.getV9()).v10(req.getV10())
            .v11(req.getV11()).v12(req.getV12()).v13(req.getV13()).v14(req.getV14()).build();

        var prediction = mlClient.predict(txn);
        double score = prediction.getFraudProbability();

        String status = score >= highRisk ? "FRAUDULENT" : score >= mediumRisk ? "REVIEW" : "LEGITIMATE";
        String reason = status.equals("LEGITIMATE") ? null
            : String.format("ML confidence: %.1f%%. %s", score * 100,
                status.equals("FRAUDULENT") ? "Blocked." : "Requires review.");

        txn.setRiskScore(score);
        txn.setFraudStatus(status);
        txn.setFraudReason(reason);
        Transaction saved = txnRepo.save(txn);

        String alertId = null;
        if (!"LEGITIMATE".equals(status)) alertId = generateAlert(saved).getId();

        return toResponse(saved, alertId);
    }

    public RiskScoreResponse getRiskScore(String transactionId) {
        var txn = txnRepo.findByTransactionId(transactionId)
            .orElseThrow(() -> new RuntimeException("Transaction not found: " + transactionId));
        String level = riskLevel(txn.getRiskScore());
        return RiskScoreResponse.builder()
            .transactionId(transactionId).riskScore(txn.getRiskScore())
            .riskLevel(level).fraudStatus(txn.getFraudStatus())
            .recommendation(recommendation(txn.getFraudStatus()))
            .evaluatedAt(txn.getTimestamp()).build();
    }

    public List<TransactionResponse> getUserTransactions(String userId) {
        return txnRepo.findByUserId(userId).stream().map(t -> toResponse(t, null)).collect(Collectors.toList());
    }

    public List<TransactionResponse> getFlaggedTransactions() {
        return txnRepo.findByFraudStatus("FRAUDULENT").stream().map(t -> toResponse(t, null)).collect(Collectors.toList());
    }

    public DashboardStats getDashboardStats() {
        long total = txnRepo.count();
        long fraud = txnRepo.countByFraudStatus("FRAUDULENT");
        long review = txnRepo.countByFraudStatus("REVIEW");
        long alerts = alertRepo.countByStatus("OPEN");
        double rate = total > 0 ? Math.round((double) fraud / total * 10000.0) / 100.0 : 0.0;
        return DashboardStats.builder().totalTransactions(total).fraudulentTransactions(fraud)
            .pendingReview(review).openAlerts(alerts).fraudRate(rate).build();
    }

    private Alert generateAlert(Transaction txn) {
        String severity = txn.getRiskScore() >= highRisk ? "HIGH" : "MEDIUM";
        Alert alert = Alert.builder()
            .transactionId(txn.getId()).userId(txn.getUserId()).severity(severity)
            .alertType("FRAUDULENT".equals(txn.getFraudStatus()) ? "FRAUD_DETECTED" : "HIGH_RISK")
            .riskScore(txn.getRiskScore()).transactionAmount(txn.getAmount())
            .description(String.format("Flagged: %.2f %s | Risk: %.1f%%",
                txn.getAmount(), txn.getCurrency(), txn.getRiskScore() * 100))
            .build();
        return alertRepo.save(alert);
    }

    private String riskLevel(Double s) {
        if (s == null) return "UNKNOWN";
        if (s >= highRisk) return "HIGH";
        if (s >= mediumRisk) return "MEDIUM";
        return "LOW";
    }

    private String recommendation(String status) {
        return switch (status) {
            case "FRAUDULENT" -> "Block immediately and notify the cardholder.";
            case "REVIEW" -> "Hold and request additional verification.";
            default -> "Transaction appears legitimate. Proceed normally.";
        };
    }

    private TransactionResponse toResponse(Transaction t, String alertId) {
        return TransactionResponse.builder()
            .id(t.getId()).transactionId(t.getTransactionId()).userId(t.getUserId())
            .amount(t.getAmount()).currency(t.getCurrency()).type(t.getType())
            .merchantName(t.getMerchantName()).riskScore(t.getRiskScore())
            .fraudStatus(t.getFraudStatus()).fraudReason(t.getFraudReason())
            .timestamp(t.getTimestamp()).alertId(alertId).build();
    }
}
