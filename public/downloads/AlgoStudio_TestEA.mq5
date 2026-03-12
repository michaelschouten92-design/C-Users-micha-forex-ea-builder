//+------------------------------------------------------------------+
//|                                           AlgoStudio_TestEA.mq5  |
//|                        Deterministic test EA for deployment test  |
//+------------------------------------------------------------------+
#property copyright "AlgoStudio"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>

#define TEST_MAGIC 12345

bool g_tradeOpened = false;
bool g_tradeClosed = false;
datetime g_openTime = 0;
CTrade g_trade;

int OnInit()
{
   g_trade.SetExpertMagicNumber(TEST_MAGIC);
   Print("TEST_EA: Initialized. Magic=", TEST_MAGIC, " Symbol=", _Symbol);
   return INIT_SUCCEEDED;
}

void OnTick()
{
   if(g_tradeClosed) return;

   if(!g_tradeOpened)
   {
      g_trade.Buy(0.01, _Symbol);
      if(g_trade.ResultRetcode() == TRADE_RETCODE_DONE)
      {
         g_tradeOpened = true;
         g_openTime = TimeCurrent();
         Print("TEST_EA: OPEN TRADE ticket=", g_trade.ResultOrder(),
               " price=", g_trade.ResultPrice());
      }
      else
      {
         Print("TEST_EA: OPEN FAILED code=", g_trade.ResultRetcode());
      }
      return;
   }

   // Wait 5 seconds then close
   if(TimeCurrent() - g_openTime < 5) return;

   // Find our position and close it
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != TEST_MAGIC) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;

      g_trade.PositionClose(ticket);
      if(g_trade.ResultRetcode() == TRADE_RETCODE_DONE)
      {
         Print("TEST_EA: CLOSE TRADE ticket=", ticket);
      }
      else
      {
         Print("TEST_EA: CLOSE FAILED code=", g_trade.ResultRetcode());
      }
      g_tradeClosed = true;
      return;
   }
}

void OnDeinit(const int reason)
{
   Print("TEST_EA: Removed. Reason=", reason);
}
//+------------------------------------------------------------------+
