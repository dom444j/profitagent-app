const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCommissionsEndpoint() {
  try {
    console.log('=== TESTING COMMISSIONS ENDPOINT ===');
    
    // Simulate the exact same query as the backend endpoint
    const userId = 'cmeqyen000002um207uhb78in'; // user@grow5x.app
    const page = 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    console.log(`Testing for user ID: ${userId}`);
    console.log(`Page: ${page}, Limit: ${limit}, Offset: ${offset}`);
    
    const commissions = await prisma.referralCommission.findMany({
      where: {
        sponsor_id: userId
      },
      include: {
        referred_user: {
          select: {
            email: true,
            ref_code: true
          }
        }
      },
      skip: offset,
      take: limit,
      orderBy: {
        created_at: 'desc'
      }
    });
    
    const total = await prisma.referralCommission.count({
      where: {
        sponsor_id: userId
      }
    });
    
    console.log('\n=== ENDPOINT RESPONSE ===');
    console.log('Commissions found:', commissions.length);
    console.log('Total count:', total);
    
    console.log('\nCommissions data:');
    commissions.forEach((commission, index) => {
      console.log(`Commission ${index + 1}:`);
      console.log(`  ID: ${commission.id}`);
      console.log(`  Amount USDT: ${commission.amount_usdt}`);
      console.log(`  Status: ${commission.status}`);
      console.log(`  Referred User: ${commission.referred_user.email}`);
      console.log(`  Created: ${commission.created_at}`);
      console.log('  ---');
    });
    
    // Calculate what the frontend should see
    const pendingCommissions = commissions.filter(c => c.status === 'pending');
    const releasedCommissions = commissions.filter(c => c.status === 'released');
    
    const totalPending = pendingCommissions.reduce((sum, c) => sum + parseFloat(c.amount_usdt), 0);
    const totalReleased = releasedCommissions.reduce((sum, c) => sum + parseFloat(c.amount_usdt), 0);
    
    console.log('\n=== FRONTEND CALCULATIONS ===');
    console.log(`Pending commissions: ${pendingCommissions.length} (${totalPending} USDT)`);
    console.log(`Released commissions: ${releasedCommissions.length} (${totalReleased} USDT)`);
    console.log(`Total commissions: ${totalPending + totalReleased} USDT`);
    
    // Simulate the exact response structure
    const response = {
      success: true,
      data: {
        commissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
    
    console.log('\n=== FULL RESPONSE STRUCTURE ===');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCommissionsEndpoint();