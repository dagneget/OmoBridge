package com.omobridge.integrations.ussd;

import com.omobridge.identity.domain.Farmer;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.notifications.service.NotificationService;
import com.omobridge.pricing.domain.PriceRule;
import com.omobridge.pricing.domain.PriceRuleRepository;
import com.omobridge.supply.domain.FarmerPayable;
import com.omobridge.supply.domain.FarmerPayableRepository;
import com.omobridge.supply.domain.SupplyDelivery;
import com.omobridge.supply.domain.SupplyDeliveryRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UssdService {

    private final UssdSessionRepository ussdSessionRepository;
    private final FarmerRepository farmerRepository;
    private final SupplyDeliveryRepository supplyDeliveryRepository;
    private final FarmerPayableRepository farmerPayableRepository;
    private final PriceRuleRepository priceRuleRepository;

    private static final Duration SESSION_TTL = Duration.ofMinutes(3);

    @Transactional
    public UssdResponse handleUssdRequest(UssdRequest request) {
        String phone = request.phoneNumber().trim();
        log.info("Processing USSD request session={} phone={}", request.sessionId(), NotificationService.maskPhone(phone));

        Optional<UssdSession> sessionOpt = ussdSessionRepository.findBySessionId(request.sessionId());
        UssdSession session;

        if (sessionOpt.isEmpty() || sessionOpt.get().isExpired()) {
            session = sessionOpt.orElseGet(UssdSession::new);
            session.setSessionId(request.sessionId());
            session.setPhone(phone);
            session.setLanguage("am"); // default Ethiopian language
            session.setCurrentMenu("MAIN");
            session.setExpiresAt(Instant.now().plus(SESSION_TTL));
            ussdSessionRepository.save(session);
            return UssdResponse.continueSession(renderMainMenu(session.getLanguage()));
        }

        session = sessionOpt.get();
        session.setExpiresAt(Instant.now().plus(SESSION_TTL));

        String input = request.text() != null ? request.text().trim() : "";
        UssdResponse response = processMenuInput(session, input);
        ussdSessionRepository.save(session);
        return response;
    }

    private UssdResponse processMenuInput(UssdSession session, String input) {
        String menu = session.getCurrentMenu();
        String lang = session.getLanguage();

        if ("0".equals(input) && !"MAIN".equals(menu)) {
            session.setCurrentMenu("MAIN");
            return UssdResponse.continueSession(renderMainMenu(lang));
        }

        return switch (menu) {
            case "MAIN" -> handleMainMenu(session, input);
            case "MY_DELIVERIES", "MY_PAYMENTS", "BUYING_PRICES" ->
                    UssdResponse.continueSession(lang.equals("am") ? "ወደ ዋናው ማውጫ ለመመለስ 0 ይጫኑ።" : "Press 0 to return to Main Menu.");
            case "LANGUAGE" -> handleLanguageMenu(session, input);
            default -> {
                session.setCurrentMenu("MAIN");
                yield UssdResponse.continueSession(renderMainMenu(lang));
            }
        };
    }

    private UssdResponse handleMainMenu(UssdSession session, String input) {
        String lang = session.getLanguage();
        return switch (input) {
            case "1" -> {
                session.setCurrentMenu("MY_DELIVERIES");
                yield handleFarmerDeliveries(session);
            }
            case "2" -> {
                session.setCurrentMenu("MY_PAYMENTS");
                yield handleFarmerPayments(session);
            }
            case "3" -> {
                session.setCurrentMenu("BUYING_PRICES");
                yield handleBuyingPrices(session);
            }
            case "4" -> {
                session.setCurrentMenu("LANGUAGE");
                yield UssdResponse.continueSession("Select Language / ቋንቋ ይምረጡ:\n1. English\n2. አማርኛ\n0. Back / ተመለስ");
            }
            case "5" -> {
                String help = lang.equals("am")
                        ? "የኦሞብሪጅ እርዳታ: በነፃ ስልክ 8443 ይደውሉ ወይም የደቡብ ኦሞ ግብርና ጽ/ቤትን ያነጋግሩ።"
                        : "OmoBridge Support: Call toll-free 8443 or visit your local South Omo Agricultural office.";
                yield UssdResponse.endSession(help);
            }
            default -> UssdResponse.continueSession(
                    (lang.equals("am") ? "ትክክለኛ ምርጫ አይደለም።\n" : "Invalid selection.\n") + renderMainMenu(lang)
            );
        };
    }

    private UssdResponse handleFarmerDeliveries(UssdSession session) {
        Optional<Farmer> farmerOpt = farmerRepository.findByUserPhoneNumber(session.getPhone());
        if (farmerOpt.isEmpty()) {
            return UssdResponse.endSession(session.getLanguage().equals("am")
                    ? "ስልክ ቁጥርዎ እንደ አርሶ አደር አልተመዘገበም። እባክዎ በአካባቢዎ ማህበር ይመዝገቡ።"
                    : "Phone number is not registered as a farmer. Please register with your local cooperative.");
        }

        Farmer farmer = farmerOpt.get();
        List<SupplyDelivery> deliveries = supplyDeliveryRepository.findWithItemsByFarmerIdOrderByDeliveredAtDesc(farmer.getId());

        if (deliveries.isEmpty()) {
            return UssdResponse.continueSession(session.getLanguage().equals("am")
                    ? "ምንም የቀረበ ምርት አልተገኘም።\n0. ተመለስ"
                    : "No supply deliveries found.\n0. Back");
        }

        StringBuilder sb = new StringBuilder();
        if (session.getLanguage().equals("am")) {
            sb.append("የአርሶ አደር ኮድ: ").append(farmer.getFarmerCode()).append("\nየቅርብ አቅርቦቶች:\n");
            deliveries.stream().limit(3).forEach(d -> {
                String itemSummary = d.getItems().isEmpty() ? "ምርት" :
                        (d.getItems().iterator().next().getProductType() != null
                                ? d.getItems().iterator().next().getProductType().getName() : "ምርት");
                sb.append("• ").append(itemSummary).append(" (").append(d.getDeliveryNo()).append(")\n");
            });
            sb.append("0. ተመለስ");
        } else {
            sb.append("Farmer: ").append(farmer.getFarmerCode()).append("\nRecent Deliveries:\n");
            deliveries.stream().limit(3).forEach(d -> {
                String itemSummary = d.getItems().isEmpty() ? "Crop" :
                        (d.getItems().iterator().next().getProductType() != null
                                ? d.getItems().iterator().next().getProductType().getName() : "Crop");
                sb.append("• ").append(itemSummary).append(" (").append(d.getDeliveryNo()).append(")\n");
            });
            sb.append("0. Back");
        }

        return UssdResponse.continueSession(sb.toString());
    }

    private UssdResponse handleFarmerPayments(UssdSession session) {
        Optional<Farmer> farmerOpt = farmerRepository.findByUserPhoneNumber(session.getPhone());
        if (farmerOpt.isEmpty()) {
            return UssdResponse.endSession(session.getLanguage().equals("am")
                    ? "ስልክ ቁጥርዎ እንደ አርሶ አደር አልተመዘገበም።"
                    : "Phone number is not registered as a farmer.");
        }

        Farmer farmer = farmerOpt.get();
        List<FarmerPayable> openPayables = farmerPayableRepository.findOpenAndPartialPayablesOldestFirst(farmer.getId());

        BigDecimal totalPending = openPayables.stream()
                .map(p -> p.getAmountDue().subtract(p.getAmountAllocated()))
                .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

        StringBuilder sb = new StringBuilder();
        if (session.getLanguage().equals("am")) {
            sb.append("የአርሶ አደር ኮድ: ").append(farmer.getFarmerCode()).append("\n");
            sb.append("ያልተከፈለ ቀሪ ሂሳብ: ").append(totalPending).append(" ብር\n");
            sb.append("የክፍያ ብዛት: ").append(openPayables.size()).append(" አቅርቦቶች\n");
            sb.append("0. ተመለስ");
        } else {
            sb.append("Farmer: ").append(farmer.getFarmerCode()).append("\n");
            sb.append("Pending Balance: ").append(totalPending).append(" ETB\n");
            sb.append("Unpaid Records: ").append(openPayables.size()).append(" deliveries\n");
            sb.append("0. Back");
        }

        return UssdResponse.continueSession(sb.toString());
    }

    private UssdResponse handleBuyingPrices(UssdSession session) {
        List<PriceRule> rules = priceRuleRepository.findAll();
        StringBuilder sb = new StringBuilder();
        if (session.getLanguage().equals("am")) {
            sb.append("የዛሬ የመግዣ ዋጋዎች:\n");
            sb.append("• ሰሊጥ (Sesame): 120.00 ብር/ኪግ\n");
            sb.append("• ቡና (Coffee): 180.00 ብር/ኪግ\n");
            sb.append("• ማር (Honey): 350.00 ብር/ኪግ\n");
            sb.append("0. ተመለስ");
        } else {
            sb.append("Today's Buying Prices:\n");
            sb.append("• Sesame: 120.00 ETB/kg\n");
            sb.append("• Coffee: 180.00 ETB/kg\n");
            sb.append("• Pure Honey: 350.00 ETB/kg\n");
            sb.append("0. Back");
        }
        return UssdResponse.continueSession(sb.toString());
    }

    private UssdResponse handleLanguageMenu(UssdSession session, String input) {
        if ("1".equals(input)) {
            session.setLanguage("en");
            session.setCurrentMenu("MAIN");
            return UssdResponse.continueSession("Language set to English.\n" + renderMainMenu("en"));
        } else if ("2".equals(input)) {
            session.setLanguage("am");
            session.setCurrentMenu("MAIN");
            return UssdResponse.continueSession("ቋንቋ ወደ አማርኛ ተቀይሯል።\n" + renderMainMenu("am"));
        }
        return UssdResponse.continueSession("Select Language / ቋንቋ ይምረጡ:\n1. English\n2. አማርኛ\n0. Back");
    }

    private String renderMainMenu(String lang) {
        if ("am".equals(lang)) {
            return """
                    እንኳን ወደ ኦሞብሪጅ በደህና መጡ
                    1. ያቀረቧቸው ምርቶች
                    2. የክፍያ ሁኔታ እና ቀሪ ሂሳብ
                    3. የዛሬ የመግዣ ዋጋዎች
                    4. ቋንቋ (Language)
                    5. እርዳታ""";
        }
        return """
                Welcome to OmoBridge
                1. My Deliveries
                2. My Payments & Balance
                3. Today's Buying Prices
                4. Language
                5. Help""";
    }
}
