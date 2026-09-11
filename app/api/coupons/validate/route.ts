import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { code, planAmount } = await req.json();

    if (!code || typeof planAmount !== 'number') {
      return NextResponse.json({ valid: false, message: 'Invalid request' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return NextResponse.json({ valid: false, message: 'Invalid or expired coupon code' }, { status: 404 });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, message: 'This coupon has expired' }, { status: 400 });
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ valid: false, message: 'This coupon has reached its usage limit' }, { status: 400 });
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (planAmount * coupon.discount_value) / 100;
    } else {
      discountAmount = coupon.discount_value;
    }
    discountAmount = Math.min(discountAmount, planAmount);
    const finalAmount = Math.max(planAmount - discountAmount, 0);

    return NextResponse.json({
      valid: true,
      coupon: { code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value },
      discountAmount,
      finalAmount,
    });
  } catch (err) {
    console.error('Coupon validation error:', err);
    return NextResponse.json({ valid: false, message: 'Server error' }, { status: 500 });
  }
}
