package com.omobridge.common.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class MoneyUtil {

    public static final String DEFAULT_CURRENCY = "ETB";
    public static final int MONEY_SCALE = 2;
    public static final int QUANTITY_SCALE = 3;
    public static final RoundingMode ROUNDING_MODE = RoundingMode.HALF_UP;

    private MoneyUtil() {}

    public static BigDecimal roundMoney(BigDecimal amount) {
        if (amount == null) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, ROUNDING_MODE);
        }
        return amount.setScale(MONEY_SCALE, ROUNDING_MODE);
    }

    public static BigDecimal roundQuantity(BigDecimal quantity) {
        if (quantity == null) {
            return BigDecimal.ZERO.setScale(QUANTITY_SCALE, ROUNDING_MODE);
        }
        return quantity.setScale(QUANTITY_SCALE, ROUNDING_MODE);
    }

    public static BigDecimal multiply(BigDecimal unitPrice, BigDecimal quantity) {
        if (unitPrice == null || quantity == null) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, ROUNDING_MODE);
        }
        return unitPrice.multiply(quantity).setScale(MONEY_SCALE, ROUNDING_MODE);
    }

    public static boolean isPositive(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) > 0;
    }

    public static boolean isNonNegative(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) >= 0;
    }
}
