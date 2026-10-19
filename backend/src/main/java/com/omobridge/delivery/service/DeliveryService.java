package com.omobridge.delivery.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.util.CodeGenerator;
import com.omobridge.delivery.api.dto.CreateDeliveryJobRequest;
import com.omobridge.delivery.api.dto.DeliveryJobResponse;
import com.omobridge.delivery.api.dto.DeliveryTrackingResponse;
import com.omobridge.delivery.api.dto.LocationIngestionRequest;
import com.omobridge.delivery.api.dto.LocationPointResponse;
import com.omobridge.delivery.domain.DeliveryJob;
import com.omobridge.delivery.domain.DeliveryJobOrder;
import com.omobridge.delivery.domain.DeliveryJobOrderRepository;
import com.omobridge.delivery.domain.DeliveryJobRepository;
import com.omobridge.delivery.domain.DeliveryLocation;
import com.omobridge.delivery.domain.DeliveryLocationRepository;
import com.omobridge.delivery.domain.DeliveryStatus;
import com.omobridge.delivery.domain.DeliveryStatusHistory;
import com.omobridge.delivery.domain.DeliveryStatusHistoryRepository;
import com.omobridge.identity.domain.DeliveryProvider;
import com.omobridge.identity.domain.DeliveryProviderRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.VerificationStatus;
import com.omobridge.orders.domain.Order;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.orders.domain.OrderStatus;
import com.omobridge.orders.service.OrderService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliveryService {

    private final DeliveryJobRepository deliveryJobRepository;
    private final DeliveryJobOrderRepository deliveryJobOrderRepository;
    private final DeliveryLocationRepository deliveryLocationRepository;
    private final DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;
    private final DeliveryProviderRepository deliveryProviderRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final CodeGenerator codeGenerator;
    private final AuditService auditService;

    @Transactional
    public DeliveryJobResponse createAndAssignJob(CreateDeliveryJobRequest request, User actor) {
        if (request.orderIds() == null || request.orderIds().isEmpty()) {
            throw new BusinessRuleException("Delivery job requires at least one order");
        }

        List<Order> orders = new ArrayList<>();
        for (UUID orderId : request.orderIds()) {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
            if (order.getStatus() != OrderStatus.PAID && order.getStatus() != OrderStatus.PACKED) {
                throw new BusinessRuleException("Cannot create delivery job for unpaid order " + order.getOrderNo());
            }
            orders.add(order);
        }

        DeliveryProvider provider = null;
        if (request.providerId() != null) {
            provider = deliveryProviderRepository.findById(request.providerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Delivery provider not found: " + request.providerId()));
            if (provider.getVerificationStatus() != VerificationStatus.VERIFIED) {
                throw new BusinessRuleException("Cannot assign unapproved delivery provider: " + provider.getId());
            }
        }

        DeliveryJob job = new DeliveryJob();
        job.setJobNo(codeGenerator.generateDeliveryNumber());
        job.setProvider(provider);
        job.setStatus(provider != null ? DeliveryStatus.ASSIGNED : DeliveryStatus.PENDING);
        job.setPickupAddress(request.pickupAddress());
        job.setPickupLatitude(request.pickupLatitude());
        job.setPickupLongitude(request.pickupLongitude());
        job.setDropoffAddress(request.dropoffAddress());
        job.setDropoffLatitude(request.dropoffLatitude());
        job.setDropoffLongitude(request.dropoffLongitude());
        job.setFee(request.fee());
        job.setCurrency("ETB");
        job.setTrackingToken(UUID.randomUUID().toString().replace("-", ""));
        DeliveryJob savedJob = deliveryJobRepository.save(job);

        // Split delivery fee across orders (sum of allocated fees matches job fee exactly)
        int orderCount = orders.size();
        BigDecimal totalFee = request.fee();
        BigDecimal perOrderFee = totalFee.divide(BigDecimal.valueOf(orderCount), 2, RoundingMode.FLOOR);
        BigDecimal remainder = totalFee.subtract(perOrderFee.multiply(BigDecimal.valueOf(orderCount)));

        for (int i = 0; i < orderCount; i++) {
            Order o = orders.get(i);
            BigDecimal feeForThisOrder = (i == orderCount - 1) ? perOrderFee.add(remainder) : perOrderFee;

            DeliveryJobOrder jobOrder = new DeliveryJobOrder();
            jobOrder.setJob(savedJob);
            jobOrder.setOrder(o);
            jobOrder.setAllocatedFee(feeForThisOrder);
            deliveryJobOrderRepository.save(jobOrder);
            savedJob.getJobOrders().add(jobOrder);
        }

        DeliveryStatusHistory history = new DeliveryStatusHistory();
        history.setJob(savedJob);
        history.setFromStatus(null);
        history.setToStatus(savedJob.getStatus());
        history.setChangedByUser(actor);
        history.setReason("Delivery job created and assigned");
        deliveryStatusHistoryRepository.save(history);
        savedJob.getStatusHistories().add(history);

        auditService.record("DELIVERY_JOB_CREATED", "DELIVERY_JOB", savedJob.getId(),
                "Delivery job " + savedJob.getJobNo() + " created with " + orders.size() + " orders");

        return mapToJobResponse(savedJob);
    }

    @Transactional(readOnly = true)
    public List<DeliveryJobResponse> getProviderJobs(UUID providerId, User actor) {
        DeliveryProvider provider = deliveryProviderRepository.findWithUserById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Provider not found: " + providerId));

        if (!provider.getUser().getId().equals(actor.getId()) &&
                actor.getRoles().stream().noneMatch(r -> r.getName().equals("ROLE_ADMIN") || r.getName().equals("SYSTEM_ADMIN"))) {
            throw new ForbiddenException("Access denied to another provider's jobs");
        }

        return deliveryJobRepository.findByProviderIdOrderByCreatedAtDesc(providerId).stream()
                .map(this::mapToJobResponse)
                .toList();
    }

    @Transactional
    public DeliveryJobResponse updateJobStatus(UUID jobId, DeliveryStatus newStatus, String reason, User actor) {
        DeliveryJob job = deliveryJobRepository.findDetailsById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery job not found: " + jobId));

        if (job.getProvider() != null && !job.getProvider().getUser().getId().equals(actor.getId()) &&
                actor.getRoles().stream().noneMatch(r -> r.getName().equals("ROLE_ADMIN") || r.getName().equals("SYSTEM_ADMIN"))) {
            throw new ForbiddenException("Access denied to update another provider's job");
        }

        DeliveryStatus currentStatus = job.getStatus();
        if (!currentStatus.canTransitionTo(newStatus)) {
            throw new BusinessRuleException("Cannot transition delivery job " + job.getJobNo()
                    + " from " + currentStatus + " to " + newStatus);
        }

        job.setStatus(newStatus);
        if (newStatus == DeliveryStatus.PICKED_UP) {
            job.setPickedUpAt(Instant.now());
            // Update linked orders to IN_TRANSIT
            for (DeliveryJobOrder jo : job.getJobOrders()) {
                Order o = jo.getOrder();
                if (o.getStatus() == OrderStatus.PAID || o.getStatus() == OrderStatus.PACKED) {
                    orderService.updateOrderStatus(o.getId(), OrderStatus.IN_TRANSIT, "Picked up by delivery job " + job.getJobNo(), actor);
                }
            }
        } else if (newStatus == DeliveryStatus.IN_TRANSIT) {
            for (DeliveryJobOrder jo : job.getJobOrders()) {
                Order o = jo.getOrder();
                if (o.getStatus() != OrderStatus.IN_TRANSIT) {
                    orderService.updateOrderStatus(o.getId(), OrderStatus.IN_TRANSIT, "In transit via job " + job.getJobNo(), actor);
                }
            }
        } else if (newStatus == DeliveryStatus.DELIVERED) {
            job.setDeliveredAt(Instant.now());
            // Update linked orders to DELIVERED
            for (DeliveryJobOrder jo : job.getJobOrders()) {
                Order o = jo.getOrder();
                orderService.updateOrderStatus(o.getId(), OrderStatus.DELIVERED, "Delivered via job " + job.getJobNo(), actor);
            }
        }

        deliveryJobRepository.save(job);

        DeliveryStatusHistory history = new DeliveryStatusHistory();
        history.setJob(job);
        history.setFromStatus(currentStatus);
        history.setToStatus(newStatus);
        history.setChangedByUser(actor);
        history.setReason(reason);
        deliveryStatusHistoryRepository.save(history);
        job.getStatusHistories().add(history);

        auditService.record("DELIVERY_JOB_STATUS_CHANGED", "DELIVERY_JOB", job.getId(),
                "Job " + job.getJobNo() + " transitioned from " + currentStatus + " to " + newStatus);

        return mapToJobResponse(job);
    }

    @Transactional
    public int ingestLocations(UUID jobId, List<LocationIngestionRequest> locations, User actor) {
        DeliveryJob job = deliveryJobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery job not found: " + jobId));

        if (job.getProvider() != null && !job.getProvider().getUser().getId().equals(actor.getId()) &&
                actor.getRoles().stream().noneMatch(r -> r.getName().equals("ROLE_ADMIN") || r.getName().equals("SYSTEM_ADMIN"))) {
            throw new ForbiddenException("Access denied to upload location for another provider's job");
        }

        // Ignore points recorded after delivery or when job already finished
        if (job.getStatus() == DeliveryStatus.DELIVERED || job.getStatus() == DeliveryStatus.CANCELLED) {
            log.info("Ignoring location updates for job {} already in state {}", job.getJobNo(), job.getStatus());
            return 0;
        }

        // Sort incoming points by device recordedAt timestamp (offline batch replay)
        List<LocationIngestionRequest> sortedPoints = locations.stream()
                .sorted(Comparator.comparing(LocationIngestionRequest::recordedAt))
                .toList();

        int stored = 0;
        LocationIngestionRequest lastPoint = null;
        for (LocationIngestionRequest req : sortedPoints) {
            DeliveryLocation loc = new DeliveryLocation();
            loc.setJob(job);
            loc.setLatitude(req.latitude());
            loc.setLongitude(req.longitude());
            loc.setSpeed(req.speed());
            loc.setRecordedAt(req.recordedAt());
            deliveryLocationRepository.save(loc);
            stored++;
            lastPoint = req;
        }

        if (lastPoint != null && job.getProvider() != null) {
            DeliveryProvider prov = job.getProvider();
            prov.setCurrentLatitude(BigDecimal.valueOf(lastPoint.latitude()));
            prov.setCurrentLongitude(BigDecimal.valueOf(lastPoint.longitude()));
            deliveryProviderRepository.save(prov);
        }

        return stored;
    }

    @Transactional(readOnly = true)
    public DeliveryTrackingResponse getTracking(String trackingToken) {
        DeliveryJob job = deliveryJobRepository.findDetailsByTrackingToken(trackingToken)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery tracking not found for token"));

        List<DeliveryLocation> history = deliveryLocationRepository.findByJobIdOrderByRecordedAtAsc(job.getId());
        Optional<DeliveryLocation> latest = deliveryLocationRepository.findTopByJobIdOrderByRecordedAtDesc(job.getId());

        List<LocationPointResponse> historyPoints = history.stream()
                .map(l -> new LocationPointResponse(l.getLatitude(), l.getLongitude(), l.getSpeed(), l.getRecordedAt(), l.getReceivedAt()))
                .toList();

        return new DeliveryTrackingResponse(
                job.getId(),
                job.getJobNo(),
                job.getStatus(),
                latest.map(DeliveryLocation::getLatitude).orElse(null),
                latest.map(DeliveryLocation::getLongitude).orElse(null),
                latest.map(DeliveryLocation::getSpeed).orElse(null),
                latest.map(DeliveryLocation::getRecordedAt).orElse(null),
                historyPoints
        );
    }

    private DeliveryJobResponse mapToJobResponse(DeliveryJob job) {
        List<UUID> orderIds = job.getJobOrders().stream()
                .map(jo -> jo.getOrder().getId())
                .toList();

        return new DeliveryJobResponse(
                job.getId(),
                job.getJobNo(),
                job.getProvider() != null ? job.getProvider().getId() : null,
                job.getProvider() != null ? job.getProvider().getUser().getFullName() : null,
                job.getStatus(),
                job.getPickupAddress(),
                job.getDropoffAddress(),
                job.getFee(),
                job.getCurrency(),
                job.getTrackingToken(),
                orderIds,
                job.getPickedUpAt(),
                job.getDeliveredAt(),
                job.getCreatedAt()
        );
    }
}
